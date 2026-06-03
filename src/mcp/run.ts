/* Copyright Contributors to the Malloy project / SPDX-License-Identifier: MIT */

import {MalloyError, GivenValue, QueryMaterializer} from '@malloydata/malloy';
import {
  SourceInput,
  Problem,
  loadModel,
  mapProblems,
  errorProblem,
} from './loader';
import {DEFAULT_ROW_LIMIT} from '../malloy/util';
import {withDuckdbLockRetry} from '../util';

export interface RunSelector {
  /** Prepared-query name (matches a `query:` definition). */
  name?: string;
  /** 0-based index into the file's top-level run: statements. */
  index?: number;
  /** Maximum number of rows to return. Defaults to DEFAULT_ROW_LIMIT. */
  rowLimit?: number;
  /**
   * Per-query given values, keyed by caller-facing surface name. Override
   * runtime-level defaults for this call only. The set of given names a
   * query needs is reported by `compile_file` / `list_runs` on the run or
   * query entry.
   */
  givens?: Record<string, GivenValue>;
}

export interface RunResult {
  ok: boolean;
  sql?: string;
  rowCount?: number;
  truncated?: boolean;
  rows?: unknown[];
  compileTimeMS?: number;
  totalTimeMS?: number;
  problems: Problem[];
}

/**
 * Execute one run: from a source (URI or inline). Selection precedence:
 *   1. selector.name  — a named `query:`
 *   2. selector.index — 0-based index into run: list
 *   3. else           — the final run:
 *
 * Returns rows truncated to the first ROW_LIMIT plus the generated SQL.
 * If selection fails (name doesn't match, index out of range), the error
 * lists what's available so the client can retry without re-fetching.
 */
export async function run(
  input: SourceInput,
  selector: RunSelector = {}
): Promise<RunResult> {
  const loadRes = await loadModel(input);
  if (!loadRes.ok || !loadRes.loaded) {
    return {
      ok: false,
      problems: loadRes.problems.map(p => nudgeIfFieldNotFound(p, input)),
    };
  }
  const {model, rootUrl, runtime} = loadRes.loaded;
  const modelQueries = model.queries();
  const materializer = runtime.loadModel(rootUrl);

  let query: QueryMaterializer;
  if (selector.name) {
    if (!modelQueries.named.includes(selector.name)) {
      const available = {
        queries: modelQueries.named,
        runs: modelQueries.unnamed,
      };
      return {
        ok: false,
        problems: [
          {
            severity: 'error',
            code: 'selector-not-found',
            message: `No query named '${
              selector.name
            }'. Available: ${JSON.stringify(available)}`,
            uri: rootUrl.href,
          },
        ],
      };
    }
    query = materializer.loadQueryByName(selector.name);
  } else if (typeof selector.index === 'number') {
    if (selector.index < 0 || selector.index >= modelQueries.unnamed) {
      return {
        ok: false,
        problems: [
          {
            severity: 'error',
            code: 'selector-out-of-range',
            message: `Index ${selector.index} out of range; file has ${modelQueries.unnamed} run: statement(s).`,
            uri: rootUrl.href,
          },
        ],
      };
    }
    query = materializer.loadQueryByIndex(selector.index);
  } else {
    if (modelQueries.unnamed === 0) {
      return {
        ok: false,
        problems: [
          {
            severity: 'error',
            code: 'no-run',
            message:
              'Source has no run: statement. Specify a named query via `name`, or add a run: to the source.',
            uri: rootUrl.href,
          },
        ],
      };
    }
    query = materializer.loadFinalQuery();
  }

  return executeMaterializedQuery(
    query,
    selector.rowLimit ?? DEFAULT_ROW_LIMIT,
    selector.givens,
    loadRes.problems,
    {nudge: p => nudgeIfFieldNotFound(p, input), uri: rootUrl.href}
  );
}

/**
 * Run a materialized query and shape the uniform RunResult. Shared by the open
 * `run` and the restricted run path.
 */
export async function executeMaterializedQuery(
  query: QueryMaterializer,
  rowLimit: number,
  givens: Record<string, GivenValue> | undefined,
  loadProblems: Problem[],
  opts: {nudge?: (p: Problem) => Problem; uri?: string} = {}
): Promise<RunResult> {
  const compileOpts = givens ? {givens} : undefined;
  try {
    const t0 = Date.now();
    const sql = (await query.getSQL(compileOpts)).trim();
    const t1 = Date.now();
    const results = await withDuckdbLockRetry(() =>
      query.run({rowLimit, ...compileOpts})
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
      problems: loadProblems,
    };
  } catch (e) {
    const nudge = opts.nudge ?? ((p: Problem) => p);
    if (e instanceof MalloyError) {
      return {
        ok: false,
        problems: [...loadProblems, ...mapProblems(e.problems).map(nudge)],
      };
    }
    return {ok: false, problems: [...loadProblems, errorProblem(e, opts.uri)]};
  }
}

/**
 * If an agent hits a field-not-found error while running, teach them the
 * pattern: inspect the model first. Appended rather than replaced so the
 * original compiler message is preserved for automated consumption.
 */
function nudgeIfFieldNotFound(p: Problem, input: SourceInput): Problem {
  if (p.code !== 'field-not-found') return p;
  const hint = input.uri
    ? `Call compile_file with uri="${input.uri}" to see what fields, ` +
      'measures, views, and joins exist on this source.'
    : 'Call compile on the same source (or compile_file on any imported ' +
      'file) to see what fields, measures, views, and joins exist.';
  return {
    ...p,
    message: `${p.message} — ${hint}`,
    help_topic: p.help_topic ?? 'fields',
  };
}
