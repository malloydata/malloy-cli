/* Copyright Contributors to the Malloy project / SPDX-License-Identifier: MIT */

import fs from 'node:fs';
import path from 'node:path';
import {MalloyError} from '@malloydata/malloy';
import {Problem, loadModel, mapProblems, errorProblem} from './loader';
import {compile, CompileResult, CompileOptions} from './compile';
import {RunResult, RunSelector, executeMaterializedQuery} from './run';
import {DEFAULT_ROW_LIMIT} from '../malloy/util';
import {findMalloyFiles, isHiddenPathSegment, isMalloyFile} from '../util';

/**
 * The trust boundary: an agent picks one of the operator's published models
 * by handle and submits restricted query text. A model is published only by
 * carrying the opt-in marker `##|(mcp-description) … |##`; restricted text is
 * enforced by core's `loadRestrictedQuery`.
 */

export interface ModelEntry {
  /** Path relative to the model root, e.g. `sales/orders.malloy`. */
  handle: string;
  description?: string;
}

const BLOCK_OPENER = /^([ \t]*)##\|\(mcp-description\)[ \t]*$/;
const LINE_FORM = /^[ \t]*##\(mcp-description\)[ \t]?(.*)$/;

function hasMarker(text: string): boolean {
  return text
    .split(/\r?\n/)
    .some(line => BLOCK_OPENER.test(line) || LINE_FORM.test(line));
}

export function extractDescription(text: string): string | undefined {
  const lines = text.split(/\r?\n/);
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
 * Resolve a client-supplied handle to a path inside the model root. The
 * checks here are the trust boundary; every rejection returns the same
 * `model-not-found` so a probe can't learn why a path was refused. The
 * excluded-segment check keeps the reachable set equal to what `listModels`
 * (via `findMalloyFiles`) enumerates.
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
  if (rel.split(path.sep).some(isHiddenPathSegment)) {
    return {problem: notFound(handle)};
  }
  if (!isMalloyFile(abs) || !fs.existsSync(abs)) {
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

export function listModels(root: string): ModelEntry[] {
  const models: ModelEntry[] = [];
  for (const abs of findMalloyFiles(root)) {
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

/** Validate (no execution) restricted query text against a published model. */
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
  const q = runtime.loadModel(rootUrl).loadRestrictedQuery(query);
  return executeMaterializedQuery(
    q,
    selector.rowLimit ?? DEFAULT_ROW_LIMIT,
    selector.givens,
    loadRes.problems
  );
}

export function resolveModelRoot(projectDir: string | undefined): string {
  if (!projectDir) {
    throw new Error(
      'Restricted MCP mode (--restricted) requires a project directory: ' +
        'pass -p DIR to scope which models are exposed.'
    );
  }
  return path.resolve(projectDir);
}
