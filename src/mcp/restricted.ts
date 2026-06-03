/* Copyright Contributors to the Malloy project / SPDX-License-Identifier: MIT */

import fs from 'node:fs';
import path from 'node:path';
import {MalloyError, GivenValue} from '@malloydata/malloy';
import {Problem, loadModel, mapProblems, errorProblem} from './loader';
import {compile, CompileResult, CompileOptions} from './compile';
import {RunResult, RunSelector} from './run';
import {DEFAULT_ROW_LIMIT} from '../malloy/util';
import {withDuckdbLockRetry} from '../util';

/**
 * Restricted-mode MCP surface. The trust boundary: an untrusted agent picks
 * one of the operator's *published* models by handle and submits restricted
 * query text that compiles against it. The agent never supplies a file URI,
 * an `import`, or any of the SQL escape hatches — malloy core's
 * `loadRestrictedQuery` rejects those at translate time.
 *
 * A model is published only if it carries the opt-in marker annotation
 * `##|(mcp-description) … |##` (single-line `##(mcp-description) text` also
 * accepted). The marker body doubles as the model's AI-facing description.
 * The marker gates every operation here, so the exposed surface is exactly
 * the set of marked `.malloy` files under the model root.
 */

/** A model exposed to restricted clients. */
export interface ModelEntry {
  /** Path relative to the model root, e.g. `sales/orders.malloy`. */
  handle: string;
  /** The `(mcp-description)` marker body, if any text was supplied. */
  description?: string;
}

// The opt-in marker, in its two accepted forms. Both anchor to the start of a
// line (after optional indentation): the block opener `##|(mcp-description)`
// and the single-line `##(mcp-description)`.
const BLOCK_OPENER = /^([ \t]*)##\|\(mcp-description\)[ \t]*$/;
const LINE_FORM = /^[ \t]*##\(mcp-description\)[ \t]?(.*)$/;

/** Cheap test (no compile) for whether source text opts the model in. */
function hasMarker(text: string): boolean {
  return text
    .split('\n')
    .some(line => BLOCK_OPENER.test(line) || LINE_FORM.test(line));
}

/**
 * Pull the `(mcp-description)` body out of source text without compiling.
 * Block form: every line between the `##|(mcp-description)` opener and the
 * `|##` closer (at the opener's column), de-indented. Single-line form: the
 * text trailing the marker. Returns undefined when no marker, or the marker
 * carried no body.
 */
export function extractDescription(text: string): string | undefined {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const block = BLOCK_OPENER.exec(lines[i]);
    if (block) {
      const indent = block[1];
      const body: string[] = [];
      for (let j = i + 1; j < lines.length; j++) {
        if (/^[ \t]*\|##[ \t]*$/.test(lines[j])) {
          const desc = body
            .map(l => (l.startsWith(indent) ? l.slice(indent.length) : l))
            .join('\n')
            .trim();
          return desc.length > 0 ? desc : undefined;
        }
        body.push(lines[j]);
      }
      // Unterminated block — treat the opener as a marker with no usable body.
      return undefined;
    }
    const line = LINE_FORM.exec(lines[i]);
    if (line) {
      const desc = line[1].trim();
      return desc.length > 0 ? desc : undefined;
    }
  }
  return undefined;
}

function notFound(handle: string): Problem {
  return {
    severity: 'error',
    code: 'model-not-found',
    message:
      `No published model '${handle}'. Models are exposed by carrying the ` +
      '`##|(mcp-description) … |##` marker; call list_models to see what is ' +
      'available.',
  };
}

/**
 * Resolve a client-supplied handle to an absolute path, enforcing the trust
 * boundary: the handle must stay inside the model root (no absolute paths, no
 * `..` traversal), name an existing `.malloy` file, and carry the opt-in
 * marker. Anything else is reported as `model-not-found` so the boundary
 * never leaks why a path was rejected.
 */
export function resolveHandle(
  root: string,
  handle: string
): {abs: string} | {problem: Problem} {
  if (path.isAbsolute(handle) || handle.includes('\0')) {
    return {problem: notFound(handle)};
  }
  const abs = path.resolve(root, handle);
  const rel = path.relative(root, abs);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    return {problem: notFound(handle)};
  }
  if (!abs.endsWith('.malloy') || !fs.existsSync(abs)) {
    return {problem: notFound(handle)};
  }
  let text: string;
  try {
    text = fs.readFileSync(abs, 'utf8');
  } catch {
    return {problem: notFound(handle)};
  }
  if (!hasMarker(text)) {
    return {problem: notFound(handle)};
  }
  return {abs};
}

function walkMalloyFiles(dir: string, out: string[]): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, {withFileTypes: true});
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkMalloyFiles(full, out);
    } else if (entry.isFile() && entry.name.endsWith('.malloy')) {
      out.push(full);
    }
  }
}

/**
 * Enumerate published models under the root: every `.malloy` file carrying
 * the marker, by relative handle, with its description. No compilation.
 */
export function listModels(root: string): ModelEntry[] {
  const files: string[] = [];
  walkMalloyFiles(root, files);
  const models: ModelEntry[] = [];
  for (const abs of files) {
    let text: string;
    try {
      text = fs.readFileSync(abs, 'utf8');
    } catch {
      continue;
    }
    if (!hasMarker(text)) continue;
    const handle = path.relative(root, abs).split(path.sep).join('/');
    const description = extractDescription(text);
    models.push(description ? {handle, description} : {handle});
  }
  models.sort((a, b) => a.handle.localeCompare(b.handle));
  return models;
}

/** Curated surface of one published model (reuses the open compile path). */
export async function describeModel(
  root: string,
  handle: string,
  opts: CompileOptions = {}
): Promise<CompileResult> {
  const resolved = resolveHandle(root, handle);
  if ('problem' in resolved) {
    return {ok: false, problems: [resolved.problem]};
  }
  return compile({uri: resolved.abs}, opts);
}

/**
 * Compile (validate only) restricted query text against a published model.
 * Non-throwing: returns the full problem list, including any
 * `restricted-construct-forbidden` rejections.
 */
export async function compileRestricted(
  root: string,
  handle: string,
  query: string
): Promise<{ok: boolean; problems: Problem[]}> {
  const resolved = resolveHandle(root, handle);
  if ('problem' in resolved) {
    return {ok: false, problems: [resolved.problem]};
  }
  const loadRes = await loadModel({uri: resolved.abs});
  if (!loadRes.ok || !loadRes.loaded) {
    return {ok: false, problems: loadRes.problems};
  }
  const {runtime, rootUrl} = loadRes.loaded;
  try {
    const q = runtime.loadModel(rootUrl).loadRestrictedQuery(query);
    const problems = mapProblems(await q.validate());
    const hasError = problems.some(p => p.severity === 'error');
    return {ok: !hasError, problems: [...loadRes.problems, ...problems]};
  } catch (e) {
    if (e instanceof MalloyError) {
      return {
        ok: false,
        problems: [...loadRes.problems, ...mapProblems(e.problems)],
      };
    }
    return {ok: false, problems: [...loadRes.problems, errorProblem(e)]};
  }
}

/**
 * Execute restricted query text against a published model. Mirrors the open
 * `run` result shape (SQL + rows + timing) and the same error handling, but
 * the query compiles in restricted mode and the model is selected by handle.
 */
export async function runRestricted(
  root: string,
  handle: string,
  query: string,
  selector: Pick<RunSelector, 'rowLimit' | 'givens'> = {}
): Promise<RunResult> {
  const resolved = resolveHandle(root, handle);
  if ('problem' in resolved) {
    return {ok: false, problems: [resolved.problem]};
  }
  const loadRes = await loadModel({uri: resolved.abs});
  if (!loadRes.ok || !loadRes.loaded) {
    return {ok: false, problems: loadRes.problems};
  }
  const {runtime, rootUrl} = loadRes.loaded;
  const rowLimit = selector.rowLimit ?? DEFAULT_ROW_LIMIT;
  const givenOpts: {givens?: Record<string, GivenValue>} = selector.givens
    ? {givens: selector.givens}
    : {};
  try {
    const q = runtime.loadModel(rootUrl).loadRestrictedQuery(query);
    const t0 = Date.now();
    const sql = (await q.getSQL(givenOpts)).trim();
    const t1 = Date.now();
    const results = await withDuckdbLockRetry(() =>
      q.run({rowLimit, ...givenOpts})
    );
    const t2 = Date.now();
    const rows = results.toJSON().queryResult.result;
    return {
      ok: true,
      sql,
      rowCount: rows.length,
      truncated: rows.length === rowLimit,
      rows,
      compileTimeMS: t1 - t0,
      totalTimeMS: t2 - t0,
      problems: loadRes.problems,
    };
  } catch (e) {
    if (e instanceof MalloyError) {
      return {
        ok: false,
        problems: [...loadRes.problems, ...mapProblems(e.problems)],
      };
    }
    return {ok: false, problems: [...loadRes.problems, errorProblem(e)]};
  }
}

/**
 * Resolve the directory whose marked `.malloy` files the restricted server
 * publishes. This is the `-p DIR` project dir, passed through from the CLI;
 * restricted mode is meaningless without it.
 */
export function resolveModelRoot(projectDir: string | undefined): string {
  if (!projectDir) {
    throw new Error(
      'Restricted MCP mode (--restricted) requires a project directory: ' +
        'pass -p DIR to scope which models are exposed.'
    );
  }
  return path.resolve(projectDir);
}
