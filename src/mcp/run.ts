/* Copyright Contributors to the Malloy project / SPDX-License-Identifier: MIT */

import {MalloyError} from '@malloydata/malloy';
import {
  SourceInput,
  Problem,
  loadModel,
  mapProblems,
  errorProblem,
} from './loader';

const ROW_LIMIT = 200;

export interface RunSelector {
  /** Prepared-query name (matches a `query:` definition). */
  name?: string;
  /** 0-based index into the file's top-level run: statements. */
  index?: number;
}

export interface RunResult {
  ok: boolean;
  sql?: string;
  rowCount?: number;
  truncated?: boolean;
  rows?: unknown[];
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
  const queryList = model._modelDef.queryList ?? [];

  try {
    const materializer = runtime.loadModel(rootUrl);
    let query;
    if (selector.name) {
      const named = model.namedQueries.find(
        nq => (nq.as ?? nq.name) === selector.name
      );
      if (!named) {
        const available = {
          queries: model.namedQueries.map(nq => nq.as ?? nq.name ?? ''),
          runs: queryList.map((q, i) => ({index: i, name: q.name ?? null})),
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
      if (selector.index < 0 || selector.index >= queryList.length) {
        return {
          ok: false,
          problems: [
            {
              severity: 'error',
              code: 'selector-out-of-range',
              message: `Index ${selector.index} out of range; file has ${queryList.length} run: statement(s).`,
              uri: rootUrl.href,
            },
          ],
        };
      }
      query = materializer.loadQueryByIndex(selector.index);
    } else {
      if (queryList.length === 0) {
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

    const sql = (await query.getSQL()).trim();
    const results = await query.run();
    const json = results.toJSON();
    const rows = (json.queryResult?.result ?? []) as unknown[];
    const truncated = rows.length > ROW_LIMIT;
    return {
      ok: true,
      sql,
      rowCount: rows.length,
      truncated,
      rows: truncated ? rows.slice(0, ROW_LIMIT) : rows,
      problems: loadRes.problems,
    };
  } catch (e) {
    if (e instanceof MalloyError) {
      return {
        ok: false,
        problems: [
          ...loadRes.problems,
          ...mapProblems(e.problems).map(p => nudgeIfFieldNotFound(p, input)),
        ],
      };
    }
    return {
      ok: false,
      problems: [...loadRes.problems, errorProblem(e, rootUrl.href)],
    };
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
