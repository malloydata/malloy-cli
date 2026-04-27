/* Copyright Contributors to the Malloy project / SPDX-License-Identifier: MIT */

import {
  Explore,
  ExploreField,
  AtomicField,
  QueryField,
  Field,
  Model,
  expressionIsAggregate,
  expressionIsAnalytic,
} from '@malloydata/malloy';
import {
  SourceInput,
  Problem,
  LoadedModel,
  loadModel,
  mapProblems,
  errorProblem,
} from './loader';

/**
 * A compact location: `[line, col]` (start only), 0-based. Agents rarely
 * need the end range; including it for every field bloats the output.
 */
type Loc = [number, number];

interface FieldInfo {
  name: string;
  kind: 'dimension' | 'measure' | 'view' | 'join';
  type?: string;
  /** Only emitted when the defining expression differs from the field name. */
  expression?: string;
  /** Only emitted when non-empty. */
  annotations?: string[];
  /** Only emitted when the field is defined in the local file. */
  location?: Loc;
  /**
   * For joins: the Malloy-source vocabulary for the relationship,
   * matching the language (`join_one`/`join_many`/`join_cross`).
   */
  relationship?: 'one' | 'many' | 'cross';
  /**
   * For joins that point at another named source in this model, the name of
   * that source. The client can look it up in `model.sources[]` instead of
   * having its fields duplicated here.
   */
  source_ref?: string;
  /**
   * For joins without a `source_ref` (anonymous records / arrays), the
   * sub-schema is included inline. If `expand: "inline"` was requested, this
   * is also populated for joins that would otherwise use `source_ref`.
   */
  fields?: FieldInfo[];
  /**
   * For views only: the verbatim source text of the view body (the part
   * inside the curly braces) when the view is locally defined.
   */
  body?: string;
}

interface SourceInfo {
  name: string;
  annotations?: string[];
  location?: Loc;
  primaryKey?: string;
  dimensions: FieldInfo[];
  measures: FieldInfo[];
  views: FieldInfo[];
  joins: FieldInfo[];
}

interface NamedQueryInfo {
  name: string;
  annotations?: string[];
  location?: Loc;
  body?: string;
}

interface RunInfo {
  index: number;
  name?: string;
  annotations?: string[];
  location?: Loc;
  sql?: string;
  error?: string;
}

interface ModelDescription {
  rootUri: string;
  annotations?: string[];
  sources: SourceInfo[];
  queries: NamedQueryInfo[];
  runs: RunInfo[];
}

export interface CompileResult {
  ok: boolean;
  model?: ModelDescription;
  problems: Problem[];
}

export interface CompileOptions {
  /**
   * Controls how joins that point at named sources are rendered.
   * - 'ref'    (default): emit `source_ref`, no inlined fields
   * - 'inline': emit recursive `fields[]` even when there's a source_ref
   */
  expand?: 'ref' | 'inline';
  /**
   * If true, run: statements are compiled to SQL. Default: true.
   */
  emitRunSql?: boolean;
}

const MAX_JOIN_DEPTH = 4;

type MalloyLocation = {
  url: string;
  range: {
    start: {line: number; character: number};
    end: {line: number; character: number};
  };
};

function toLoc(loc?: MalloyLocation): Loc | undefined {
  if (!loc) return undefined;
  return [loc.range.start.line, loc.range.start.character];
}

function isLocal(loc: {url: string} | undefined, rootUri: string): boolean {
  return !!loc && loc.url === rootUri;
}

/** Slice [start..end) from source text using a Malloy DocumentLocation. */
function sliceSource(
  src: string | undefined,
  loc: MalloyLocation | undefined
): string | undefined {
  if (!src || !loc) return undefined;
  const lines = src.split('\n');
  const {start, end} = loc.range;
  if (start.line < 0 || start.line >= lines.length) return undefined;
  if (end.line < 0 || end.line >= lines.length) return undefined;

  if (start.line === end.line) {
    return lines[start.line].slice(start.character, end.character);
  }
  const out: string[] = [lines[start.line].slice(start.character)];
  for (let i = start.line + 1; i < end.line; i++) out.push(lines[i]);
  out.push(lines[end.line].slice(0, end.character));
  return out.join('\n');
}

function joinRel(ef: ExploreField): 'one' | 'many' | 'cross' {
  const j = (ef.structDef as {join?: string}).join;
  if (j === 'one' || j === 'many' || j === 'cross') return j;
  return 'one';
}

function isScalarArray(parent: ExploreField): boolean {
  const sd = parent.structDef as {
    type?: string;
    elementTypeDef?: {type?: string};
  };
  return sd.type === 'array' && sd.elementTypeDef?.type !== 'record_element';
}

function isRepeatedRecord(parent: ExploreField): boolean {
  const sd = parent.structDef as {
    type?: string;
    elementTypeDef?: {type?: string};
  };
  return sd.type === 'array' && sd.elementTypeDef?.type === 'record_element';
}

function isAnonymousRecord(parent: ExploreField): boolean {
  const sd = parent.structDef as {type?: string};
  return sd.type === 'record';
}

function stripScalarArrayBackcompat(
  parent: ExploreField,
  fields: FieldInfo[]
): FieldInfo[] {
  if (!isScalarArray(parent)) return fields;
  return fields.filter(f => f.name !== 'value');
}

function fieldKind(
  af: AtomicField,
  structDefFields: Array<{name: string; expressionType?: string}>
): 'measure' | 'dimension' {
  const raw = structDefFields.find(x => x.name === af.name);
  const et = raw?.expressionType;
  if (
    et &&
    (expressionIsAggregate(et as never) || expressionIsAnalytic(et as never))
  ) {
    return 'measure';
  }
  return 'dimension';
}

function resolveSourceRef(
  ef: ExploreField,
  knownSources: Set<string>
): string | undefined {
  if (isScalarArray(ef) || isRepeatedRecord(ef) || isAnonymousRecord(ef)) {
    return undefined;
  }
  const sd = ef.structDef as {name?: string; sourceID?: string};
  if (sd.sourceID) {
    const origName = sd.sourceID.split('@')[0];
    if (origName && knownSources.has(origName)) return origName;
  }
  if (sd.name && knownSources.has(sd.name)) return sd.name;
  if (knownSources.has(ef.name)) return ef.name;
  return undefined;
}

interface DescribeContext {
  rootUri: string;
  knownSources: Set<string>;
  opts: CompileOptions;
  readSource: (urlHref: string) => string | undefined;
}

function describeField(
  f: Field,
  structDefFields: Array<{name: string; expressionType?: string}>,
  depth: number,
  ctx: DescribeContext
): FieldInfo {
  const rawAnnotations = f.getTaglines?.() ?? [];
  const mLoc = f.location as MalloyLocation | undefined;
  const local = isLocal(mLoc, ctx.rootUri);
  const base: FieldInfo = {name: f.name, kind: 'dimension'};
  if (rawAnnotations.length > 0) base.annotations = rawAnnotations;
  if (local) {
    const l = toLoc(mLoc);
    if (l) base.location = l;
  }

  if (f.isExploreField()) {
    const ef = f as ExploreField;
    const ref = resolveSourceRef(ef, ctx.knownSources);
    base.kind = 'join';
    base.relationship = joinRel(ef);
    if (ref) base.source_ref = ref;

    const shouldInline = ctx.opts.expand === 'inline' || !ref;
    if (shouldInline && depth < MAX_JOIN_DEPTH) {
      const childStructFields =
        (ef.structDef.fields as Array<{
          name: string;
          expressionType?: string;
        }>) ?? [];
      const subFields: FieldInfo[] = [];
      for (const cf of ef.allFields) {
        subFields.push(describeField(cf, childStructFields, depth + 1, ctx));
      }
      base.fields = stripScalarArrayBackcompat(ef, subFields);
    }
    return base;
  }
  if (f.isQueryField()) {
    const qf = f as QueryField;
    base.kind = 'view';
    // Only carry `expression` when it differs from the field name — for
    // most inline definitions the "expression" is the view name itself.
    const expr = qf.expression || undefined;
    if (expr && expr !== f.name) base.expression = expr;
    // Slice the view body from the original source if it's locally defined.
    if (local && mLoc) {
      const src = ctx.readSource(mLoc.url);
      const body = sliceSource(src, mLoc);
      if (body) base.body = body;
    }
    return base;
  }
  const af = f as AtomicField;
  base.kind = fieldKind(af, structDefFields);
  base.type = af.type;
  const expr = af.expression || undefined;
  if (expr && expr !== f.name) base.expression = expr;
  return base;
}

function describeExplore(e: Explore, ctx: DescribeContext): SourceInfo {
  const dims: FieldInfo[] = [];
  const meas: FieldInfo[] = [];
  const views: FieldInfo[] = [];
  const joins: FieldInfo[] = [];

  const structDefFields =
    (e.structDef.fields as Array<{name: string; expressionType?: string}>) ??
    [];

  for (const f of e.allFields) {
    const info = describeField(f, structDefFields, 0, ctx);
    switch (info.kind) {
      case 'dimension':
        dims.push(info);
        break;
      case 'measure':
        meas.push(info);
        break;
      case 'view':
        views.push(info);
        break;
      case 'join':
        joins.push(info);
        break;
    }
  }

  const sourceAnnotations = e.getTaglines?.() ?? [];
  const out: SourceInfo = {
    name: e.name,
    dimensions: dims,
    measures: meas,
    views: views,
    joins,
  };
  if (sourceAnnotations.length > 0) out.annotations = sourceAnnotations;
  const l = toLoc(e.location as MalloyLocation | undefined);
  if (l) out.location = l;
  if (e.primaryKey) out.primaryKey = e.primaryKey;
  return out;
}

function annotationNotes(
  ann: {notes?: {text: string}[]; blockNotes?: {text: string}[]} | undefined
): string[] {
  if (!ann) return [];
  const out: string[] = [];
  for (const n of ann.blockNotes ?? []) out.push(n.text);
  for (const n of ann.notes ?? []) out.push(n.text);
  return out;
}

async function describeModel(
  model: Model,
  rootUri: string,
  readSource: (urlHref: string) => string | undefined,
  opts: CompileOptions
): Promise<ModelDescription> {
  const knownSources = new Set<string>([
    ...model.explores.map(e => e.name),
    ...model.namedQueries.map(nq => nq.as ?? nq.name ?? ''),
  ]);
  const ctx: DescribeContext = {rootUri, knownSources, opts, readSource};

  const sources: SourceInfo[] = [];
  for (const e of model.explores) {
    if (!isLocal(e.location as MalloyLocation | undefined, rootUri)) continue;
    sources.push(describeExplore(e, ctx));
  }

  const queries: NamedQueryInfo[] = [];
  for (const nq of model.namedQueries) {
    const loc = nq.location as MalloyLocation | undefined;
    if (!isLocal(loc, rootUri)) continue;
    const info: NamedQueryInfo = {name: nq.as ?? nq.name ?? ''};
    const notes = annotationNotes(nq.annotation);
    if (notes.length > 0) info.annotations = notes;
    const l = toLoc(loc);
    if (l) info.location = l;
    const body = sliceSource(readSource(rootUri), loc);
    if (body) info.body = body;
    queries.push(info);
  }

  const runs: RunInfo[] = [];
  const queryList = model._modelDef.queryList ?? [];
  for (let idx = 0; idx < queryList.length; idx++) {
    const q = queryList[idx];
    const info: RunInfo = {index: idx};
    if (q.name) info.name = q.name;
    const notes = annotationNotes(q.annotation);
    if (notes.length > 0) info.annotations = notes;
    const l = toLoc(q.location as MalloyLocation | undefined);
    if (l) info.location = l;
    if (opts.emitRunSql) {
      try {
        const pq = model.getPreparedQueryByIndex(idx);
        info.sql = pq.preparedResult.sql.trim();
      } catch (e) {
        info.error = e instanceof Error ? e.message : String(e);
      }
    }
    runs.push(info);
  }

  const modelAnnotations = model.getTaglines?.() ?? [];
  const out: ModelDescription = {rootUri, sources, queries, runs};
  if (modelAnnotations.length > 0) out.annotations = modelAnnotations;
  return out;
}

/**
 * Compile a Malloy model (from a URI or an inline source string) and return
 * a structured description. On compile failure returns `ok:false` with a
 * list of problems.
 */
export async function compile(
  input: SourceInput,
  opts: CompileOptions = {}
): Promise<CompileResult> {
  const res = await loadModel(input);
  if (!res.ok || !res.loaded) {
    return {ok: false, problems: res.problems};
  }
  const {model, rootUrl, readSource} = res.loaded as LoadedModel;
  try {
    const description = await describeModel(model, rootUrl.href, readSource, {
      expand: opts.expand ?? 'ref',
      // SQL for run: statements is large and rarely needed while inspecting.
      // Caller must opt in with `emit_run_sql: true`. Use run_file to
      // actually execute a run: and get both SQL and rows.
      emitRunSql: opts.emitRunSql ?? false,
    });
    return {ok: true, model: description, problems: res.problems};
  } catch (e) {
    return {
      ok: false,
      problems: [...res.problems, errorProblem(e, rootUrl.href)],
    };
  }
}

/**
 * Lightweight discovery: list runnable things in a file without paying for
 * full model serialization. Does not compile run: SQL.
 */
export async function listRuns(input: SourceInput): Promise<{
  ok: boolean;
  rootUri?: string;
  runs: Array<{
    index: number;
    name?: string;
    location?: Loc;
    annotations?: string[];
  }>;
  queries: Array<{name: string; location?: Loc; annotations?: string[]}>;
  problems: Problem[];
}> {
  const res = await loadModel(input);
  if (!res.ok || !res.loaded) {
    return {ok: false, runs: [], queries: [], problems: res.problems};
  }
  const {model, rootUrl} = res.loaded;
  const queryList = model._modelDef.queryList ?? [];
  const runs = queryList.map((q, idx) => {
    const entry: {
      index: number;
      name?: string;
      location?: Loc;
      annotations?: string[];
    } = {index: idx};
    if (q.name) entry.name = q.name;
    const l = toLoc(q.location as MalloyLocation | undefined);
    if (l) entry.location = l;
    const notes = annotationNotes(q.annotation);
    if (notes.length > 0) entry.annotations = notes;
    return entry;
  });
  const queries = model.namedQueries
    .filter(nq =>
      isLocal(nq.location as MalloyLocation | undefined, rootUrl.href)
    )
    .map(nq => {
      const entry: {name: string; location?: Loc; annotations?: string[]} = {
        name: nq.as ?? nq.name ?? '',
      };
      const l = toLoc(nq.location as MalloyLocation | undefined);
      if (l) entry.location = l;
      const notes = annotationNotes(nq.annotation);
      if (notes.length > 0) entry.annotations = notes;
      return entry;
    });
  return {
    ok: true,
    rootUri: rootUrl.href,
    runs,
    queries,
    problems: res.problems,
  };
}

export {mapProblems, loadModel};
