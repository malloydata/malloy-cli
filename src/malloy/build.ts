/* Copyright Contributors to the Malloy project / SPDX-License-Identifier: MIT */

import fs from 'fs';
import path from 'path';
import url from 'url';
import chalk from 'chalk';
import {
  Runtime,
  Connection,
  PersistSource,
  BuildTarget,
  Manifest,
} from '@malloydata/malloy';
import {malloyConfig, urlReader} from '../config';
import {out} from '../log';
import {
  exitWithError,
  createDirectoryOrError,
  withDuckdbLockRetry,
} from '../util';

/**
 * Create a table from a SELECT statement. `tableName` must already be the
 * dialect's canonical form (see `canonicalTableName`). Uses DROP+CREATE for
 * cross-dialect safety.
 *
 * TODO: Move to core once this stabilizes.
 */
async function createTableFromSelect(
  conn: Connection,
  tableName: string,
  selectSQL: string
): Promise<void> {
  await conn.runSQL(`DROP TABLE IF EXISTS ${tableName}`);
  await conn.runSQL(`CREATE TABLE ${tableName} AS ${selectSQL}`);
}

/**
 * Check that a manifest table is still usable by compiling a tiny Malloy
 * source against it. This goes through the same schema-fetch path query
 * compilation will, so success here means the manifest entry can actually
 * back queries — not just "exists in the catalog." Used to validate a
 * proposed "up to date" skip before trusting the manifest. Failure (table
 * dropped, file moved, connection unreachable, etc.) returns false and the
 * source falls through to rebuild.
 */
async function manifestTableStillUsable(
  runtime: Runtime,
  connName: string,
  tableName: string
): Promise<boolean> {
  const escaped = tableName.replace(/'/g, "''");
  const probe = `source: __doesItBlend is ${connName}.table('${escaped}')`;
  try {
    await runtime.loadModel(probe).getModel();
    return true;
  } catch {
    return false;
  }
}

/** Where a source was declared, as something a person can act on. */
function declaredAt(source: PersistSource): string {
  const at = source.location;
  if (at === undefined) {
    return source.name;
  }
  const where = at.url.startsWith('file://')
    ? path.relative(process.cwd(), url.fileURLToPath(at.url))
    : at.url;
  return `${where}:${at.range.start.line + 1}`;
}

/** Every source that maps onto one table, for reporting. */
function targetLabel(target: BuildTarget): string {
  return target.sources.map(s => s.name).join(', ');
}

type NameResult = {name: string} | {error: string};

/**
 * A manifest entry has to hold a canonical table path for its dialect, so the
 * CREATE and the entry must both use the form `sqlValidateTableName` returns.
 * For most dialects that is the input verbatim; DuckDB's file-path branch
 * quotes it.
 */
function canonicalTableName(
  source: PersistSource,
  requested: string
): NameResult {
  const result = source.dialect.sqlValidateTableName(requested);
  return result.ok
    ? {name: result.canonical}
    : {error: `invalid persist name '${requested}': ${result.error}`};
}

/** A name somebody asked for, and where they asked for it. */
interface NameClaim {
  tableName: string;
  sites: string[];
}

function askedFor(claim: NameClaim): string {
  return `'${claim.tableName}' at ${claim.sites.join(', ')}`;
}

/**
 * More than one name for one BuildID. Only one can be honored, and honoring
 * it silently is how a request for a second table gets lost.
 */
function twoNamesError(claims: NameClaim[]): string {
  return (
    `one table, two names: ${claims.map(askedFor).join(' and ')} — these ` +
    'sources compile to the same SQL, so they share a build and can only ' +
    'produce one table. Give them one name, or make them different ' +
    'computations.'
  );
}

/**
 * The table name for a target, from the `#@ persist name=` its sources carry.
 *
 * A target is one table and several sources routinely name it — `persist` is
 * inherited and `extend` doesn't change the SQL — so they can disagree.
 */
function requestedName(target: BuildTarget): NameResult {
  const asked = new Map<string, string[]>();
  for (const source of target.sources) {
    const name = source.annotations.parseAsTag('@').tag.text('name');
    if (name === undefined) continue;
    const askers = asked.get(name) ?? [];
    askers.push(declaredAt(source));
    asked.set(name, askers);
  }
  if (asked.size === 0) {
    return {
      error: '#@ persist requires a name (e.g. #@ persist name=my_table)',
    };
  }
  if (asked.size > 1) {
    return {
      error: twoNamesError(
        [...asked].map(([tableName, sites]) => ({tableName, sites}))
      ),
    };
  }
  return {name: [...asked.keys()][0]};
}

/**
 * Who has asked for what, for the length of a run.
 *
 * Within a run a BuildID names one table and a table is built by one BuildID,
 * but `buildFiles` plans each file separately, so two files that violate
 * either direction never appear in one `BuildTargets` result. Unchecked, the
 * first way round leaves the second file reading the first's manifest entry
 * as up to date so its own `name=` is never built; the second way round
 * builds both, one silently overwriting the other under a name the manifest
 * still points two entries at.
 */
class TableClaims {
  private readonly byBuildId = new Map<string, NameClaim>();
  private readonly byTable = new Map<string, NameClaim & {buildId: string}>();

  /** Record a claim, or say why it can't be honored. */
  claim(
    buildId: string,
    connectionName: string,
    claim: NameClaim
  ): string | undefined {
    const sameBuild = this.byBuildId.get(buildId);
    if (sameBuild && sameBuild.tableName !== claim.tableName) {
      return twoNamesError([sameBuild, claim]);
    }
    const tableKey = `${connectionName}:${claim.tableName}`;
    const sameTable = this.byTable.get(tableKey);
    if (sameTable && sameTable.buildId !== buildId) {
      return (
        `one name, two tables: ${askedFor(claim)} and at ` +
        `${sameTable.sites.join(', ')} — those sources compile to different ` +
        'SQL, so building both would leave one overwriting the other. Give ' +
        'them different names.'
      );
    }
    this.byBuildId.set(buildId, claim);
    this.byTable.set(tableKey, {...claim, buildId});
    return undefined;
  }
}

export interface BuildOptions {
  refresh: Set<string>; // "connection:tableName" pairs
  dryRun: boolean;
}

/**
 * Resolve a list of paths into .malloy file paths.
 * Files are returned as-is (if they end in .malloy).
 * Directories are recursively scanned for *.malloy files.
 */
function resolveMalloyFiles(paths: string[]): string[] {
  const files: string[] = [];

  for (const p of paths) {
    const resolved = path.resolve(p);
    let stat: fs.Stats;
    try {
      stat = fs.statSync(resolved);
    } catch {
      exitWithError(`Path not found: ${p}`);
    }

    if (stat.isDirectory()) {
      collectMalloyFiles(resolved, files);
    } else if (resolved.endsWith('.malloy')) {
      files.push(resolved);
    } else {
      exitWithError(`Not a .malloy file: ${p}`);
    }
  }

  return files;
}

function collectMalloyFiles(dir: string, into: string[]): void {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectMalloyFiles(full, into);
    } else if (entry.name.endsWith('.malloy')) {
      into.push(full);
    }
  }
}

function getManifestFilePath(): string {
  if (malloyConfig.manifestURL) {
    return url.fileURLToPath(malloyConfig.manifestURL);
  }
  // Fallback: use rootDirectory if available (--projectDir with no config
  // file), otherwise cwd. This keeps manifest placement anchored to the
  // project root rather than the shell directory.
  const baseDir = malloyConfig.rootDirectory
    ? url.fileURLToPath(malloyConfig.rootDirectory)
    : process.cwd();
  const manifestDir = malloyConfig.manifestPath ?? 'MANIFESTS';
  return path.join(baseDir, manifestDir, 'malloy-manifest.json');
}

export async function buildFiles(
  paths: string[],
  options: BuildOptions
): Promise<void> {
  const files = resolveMalloyFiles(paths.length > 0 ? paths : ['.']);

  if (files.length === 0) {
    out('No .malloy files found.');
    return;
  }

  const manifestPath = getManifestFilePath();
  const manifest = new Manifest();
  const isNewManifest = !fs.existsSync(manifestPath);

  if (!isNewManifest) {
    try {
      manifest.loadText(fs.readFileSync(manifestPath, 'utf8'));
    } catch (e) {
      exitWithError(
        `Error reading manifest at ${manifestPath}: ${
          e instanceof Error ? e.message : e
        }`
      );
    }
  }

  const buildManifest = manifest.buildManifest;
  const connectionDigests: Record<string, string> = {};
  const claims = new TableClaims();
  const refreshMatched = new Set<string>();
  let totalBuilt = 0;
  let totalUpToDate = 0;
  let totalErrors = 0;

  for (const file of files) {
    const fileURL = url.pathToFileURL(file);
    const displayPath = path.relative(process.cwd(), file);

    const runtime = new Runtime({
      config: malloyConfig,
      urlReader,
      buildManifest,
    });

    let model;
    try {
      model = await withDuckdbLockRetry(() =>
        runtime.loadModel(fileURL).getModel()
      );
    } catch (e) {
      out(`\n${chalk.bold(displayPath)}`);
      out(
        `  ${chalk.red('✗')} ${chalk.red(
          `failed to compile: ${e instanceof Error ? e.message : e}`
        )}`
      );
      totalErrors++;
      continue;
    }

    // getBuildTargets throws without the flag; ask first so a real planning
    // failure isn't mistaken for "this file doesn't use persistence".
    if (
      !model.modelAnnotations
        .parseAsTag('!')
        .tag.has('experimental', 'persistence')
    ) {
      continue;
    }

    let plan;
    try {
      plan = await runtime.getBuildTargets(model);
      for (const {connectionName} of plan.connections) {
        if (!(connectionName in connectionDigests)) {
          const connection: Connection =
            await malloyConfig.connections.lookupConnection(connectionName);
          connectionDigests[connectionName] = connection.getDigest();
        }
      }
    } catch (e) {
      out(`\n${chalk.bold(displayPath)}`);
      out(
        `  ${chalk.red('✗')} ${chalk.red(
          `failed to plan build: ${e instanceof Error ? e.message : e}`
        )}`
      );
      totalErrors++;
      continue;
    }

    const targetCount = plan.connections.reduce(
      (n, c) => n + c.targets.length,
      0
    );
    if (plan.tagParseLog.length === 0 && targetCount === 0) {
      continue;
    }

    out(`\n${chalk.bold(displayPath)}`);

    for (const msg of plan.tagParseLog) {
      out(
        `  ${chalk.red('✗')} ${chalk.red(`tag parse error: ${msg.message}`)}`
      );
      totalErrors++;
    }

    // Connections are independent; within one, targets arrive in dependency
    // order, so a serial walk is correct with no scheduling of any kind.
    for (const {connectionName: connName, targets} of plan.connections) {
      for (const target of targets) {
        const label = targetLabel(target);
        const asked = requestedName(target);
        const named =
          'error' in asked
            ? asked
            : canonicalTableName(target.sources[0], asked.name);

        if ('error' in named) {
          out(
            `  ${chalk.red('✗')} ${label} ${chalk.dim(
              `(${connName})`
            )} — ${chalk.red(named.error)}`
          );
          totalErrors++;
          continue;
        }
        const tableName = named.name;

        const conflict = claims.claim(target.buildId, connName, {
          tableName,
          sites: target.sources.map(declaredAt),
        });
        if (conflict) {
          out(
            `  ${chalk.red('✗')} ${label} ${chalk.dim(
              `(${connName})`
            )} — ${chalk.red(conflict)}`
          );
          totalErrors++;
          continue;
        }

        const existingEntry = buildManifest.entries[target.buildId];
        // A rename leaves the entry under its old name until the SQL changes,
        // so accept either name for --refresh: the one asked for now and the
        // one the table was actually built under.
        const refreshKeys = [`${connName}:${tableName}`];
        if (existingEntry && existingEntry.tableName !== tableName) {
          refreshKeys.push(`${connName}:${existingEntry.tableName}`);
        }
        const matched = refreshKeys.filter(k => options.refresh.has(k));
        matched.forEach(k => refreshMatched.add(k));
        const forceRefresh = matched.length > 0;

        // Already built and not in refresh list — skip, but only if the
        // table the manifest points to is still usable. The manifest can
        // outlive its database (file deleted, project copied without the
        // data dir, restored from a backup that didn't include it, etc.);
        // trusting it blindly produced "build complete" with no data on
        // disk. We probe via a Malloy compile against the same connection
        // so this matches what query compilation will see.
        if (existingEntry && !forceRefresh) {
          const usable = await manifestTableStillUsable(
            runtime,
            connName,
            existingEntry.tableName
          );
          if (usable) {
            manifest.touch(target.buildId);
            out(
              `  ${chalk.green('✓')} ${label} ${chalk.dim(
                `(${connName})`
              )} — ${chalk.dim('up to date')}`
            );
            totalUpToDate++;
            continue;
          }
          out(
            `  ${chalk.yellow('…')} ${label} ${chalk.dim(
              `(${connName})`
            )} — ${chalk.yellow(
              `manifest entry stale (${existingEntry.tableName} missing), rebuilding`
            )}`
          );
        }

        if (options.dryRun) {
          const reason = forceRefresh ? 'refresh' : 'new';
          out(
            `  ${chalk.yellow('○')} ${label} ${chalk.dim(
              `(${connName})`
            )} — ${chalk.yellow(`would build (${reason})`)} → ${tableName}`
          );
          totalBuilt++;
          continue;
        }

        // Any of target.sources will do — they share the SQL. This is the
        // build SQL, not target.sql: dependencies built earlier in this run
        // are already table references, because buildManifest is the live
        // object manifest.update() mutates.
        const source = target.sources[0];
        const sql = source.getSQL({buildManifest, connectionDigests});

        const startTime = Date.now();
        try {
          await withDuckdbLockRetry(async () => {
            const connection =
              await malloyConfig.connections.lookupConnection(connName);
            await createTableFromSelect(connection, tableName, sql);
          });

          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          manifest.update(target.buildId, {tableName});
          out(
            `  ${chalk.green('✓')} ${label} ${chalk.dim(
              `(${connName})`
            )} — ${chalk.green('built')} ${chalk.dim(
              `(${elapsed}s)`
            )} → ${tableName}`
          );
          totalBuilt++;
        } catch (e) {
          out(
            `  ${chalk.red('✗')} ${label} ${chalk.dim(
              `(${connName})`
            )} — ${chalk.red(
              `build failed: ${e instanceof Error ? e.message : e}`
            )}`
          );
          totalErrors++;
        }
      }
    }
  }

  // A --refresh that names nothing built is almost always a typo or a name
  // that has since changed, and the run otherwise reports "up to date" and
  // looks like the refresh happened.
  const unmatched = [...options.refresh].filter(k => !refreshMatched.has(k));
  if (unmatched.length > 0) {
    out(
      `\n${chalk.yellow('!')} ${chalk.yellow(
        `--refresh matched no table: ${unmatched.join(', ')}`
      )}`
    );
  }

  // Write manifest
  if (!options.dryRun && (totalBuilt > 0 || totalUpToDate > 0)) {
    if (isNewManifest) {
      manifest.strict = true;
    }
    createDirectoryOrError(
      path.dirname(manifestPath),
      `Could not create manifest directory at ${path.dirname(manifestPath)}`
    );
    fs.writeFileSync(
      manifestPath,
      JSON.stringify(manifest.activeEntries, null, 2)
    );
    out(
      `\nManifest written: ${chalk.dim(
        path.relative(process.cwd(), manifestPath)
      )}`
    );
  }

  // Summary
  const parts: string[] = [];
  if (totalBuilt > 0)
    parts.push(
      chalk.green(`${totalBuilt} ${options.dryRun ? 'to build' : 'built'}`)
    );
  if (totalUpToDate > 0) parts.push(chalk.dim(`${totalUpToDate} up to date`));
  if (totalErrors > 0) parts.push(chalk.red(`${totalErrors} errors`));

  if (parts.length > 0) {
    out(
      `\n${options.dryRun ? 'Dry run' : 'Build'} complete: ${parts.join(', ')}`
    );
  }

  if (totalErrors > 0 && process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }
}
