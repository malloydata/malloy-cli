/* Copyright Contributors to the Malloy project / SPDX-License-Identifier: MIT */

import fs from 'fs';
import path from 'path';
import url from 'url';
import chalk from 'chalk';
import {Runtime, Connection, PersistSource, Manifest} from '@malloydata/malloy';
import {malloyConfig, urlReader} from '../config';
import {out} from '../log';
import {
  exitWithError,
  createDirectoryOrError,
  withDuckdbLockRetry,
} from '../util';
import {flattenBuildNodes} from './build_graph';

/**
 * Create a table from a SELECT statement, using the dialect to quote
 * the table name properly. Uses DROP+CREATE for cross-dialect safety.
 *
 * TODO: Move to core once this stabilizes.
 */
async function createTableFromSelect(
  conn: Connection,
  source: PersistSource,
  tableName: string,
  selectSQL: string
): Promise<void> {
  const t = source.dialect.quoteTablePath(tableName);
  await conn.runSQL(`DROP TABLE IF EXISTS ${t}`);
  await conn.runSQL(`CREATE TABLE ${t} AS ${selectSQL}`);
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

/**
 * Get the filesystem path for the manifest file.
 * Uses MalloyConfig.manifestURL when available (set via configURL overlay
 * in --projectDir, --config, or default config modes).
 */
async function getManifestFilePath(): Promise<string> {
  if (malloyConfig.manifestURL) {
    return url.fileURLToPath(malloyConfig.manifestURL);
  }
  // Fallback: use rootDirectory if available (--projectDir with no config
  // file), otherwise cwd. This keeps manifest placement anchored to the
  // project root rather than the shell directory.
  const rootDir = await malloyConfig.readOverlay('config', 'rootDirectory');
  const baseDir =
    typeof rootDir === 'string' ? url.fileURLToPath(rootDir) : process.cwd();
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

  const manifestPath = await getManifestFilePath();
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

    let plan;
    try {
      plan = model.getBuildPlan();
    } catch {
      // No ##! experimental.persistence — skip this file
      continue;
    }

    if (plan.tagParseLog.length === 0 && plan.graphs.length === 0) {
      continue;
    }

    out(`\n${chalk.bold(displayPath)}`);

    for (const msg of plan.tagParseLog) {
      out(
        `  ${chalk.red('✗')} ${chalk.red(`tag parse error: ${msg.message}`)}`
      );
      totalErrors++;
    }

    if (plan.graphs.length === 0) {
      continue;
    }

    for (const graph of plan.graphs) {
      const connName = graph.connectionName;

      // Get or cache the connection and its digest
      if (!(connName in connectionDigests)) {
        let connection: Connection;
        try {
          connection = await malloyConfig.connections.lookupConnection(
            connName
          );
        } catch (e) {
          out(
            `  ${chalk.red('✗')} ${chalk.red(
              `connection "${connName}" not found: ${
                e instanceof Error ? e.message : e
              }`
            )}`
          );
          totalErrors++;
          continue;
        }
        connectionDigests[connName] = connection.getDigest();
      }

      // Flatten into dependency order
      const allNodes = graph.nodes.flatMap(level =>
        level.flatMap(node => flattenBuildNodes([node]))
      );
      const seenIds = new Set<string>();
      const uniqueNodes = allNodes.filter(node => {
        if (seenIds.has(node.sourceID)) return false;
        seenIds.add(node.sourceID);
        return true;
      });

      for (const node of uniqueNodes) {
        const source = plan.sources[node.sourceID];
        if (!source) continue;

        const parsed = source.tagParse({prefix: /^#@ /});
        const tableName = parsed.tag.text('name');

        if (!tableName) {
          out(
            `  ${chalk.red('✗')} ${source.name} ${chalk.dim(
              `(${connName})`
            )} — ${chalk.red(
              '#@ persist requires a name (e.g. #@ persist name=my_table)'
            )}`
          );
          totalErrors++;
          continue;
        }

        const refreshKey = `${connName}:${tableName}`;
        const forceRefresh = options.refresh.has(refreshKey);

        const sql = source.getSQL({
          buildManifest,
          connectionDigests,
        });
        const buildId = source.makeBuildId(
          connectionDigests[connName],
          source.getSQL()
        );

        // Already built and not in refresh list — skip, but only if the
        // table the manifest points to is still usable. The manifest can
        // outlive its database (file deleted, project copied without the
        // data dir, restored from a backup that didn't include it, etc.);
        // trusting it blindly produced "build complete" with no data on
        // disk. We probe via a Malloy compile against the same connection
        // so this matches what query compilation will see.
        const existingEntry = buildManifest.entries[buildId];
        if (existingEntry && !forceRefresh) {
          const usable = await manifestTableStillUsable(
            runtime,
            connName,
            existingEntry.tableName
          );
          if (usable) {
            manifest.touch(buildId);
            out(
              `  ${chalk.green('✓')} ${source.name} ${chalk.dim(
                `(${connName})`
              )} — ${chalk.dim('up to date')}`
            );
            totalUpToDate++;
            continue;
          }
          out(
            `  ${chalk.yellow('…')} ${source.name} ${chalk.dim(
              `(${connName})`
            )} — ${chalk.yellow(
              `manifest entry stale (${existingEntry.tableName} missing), rebuilding`
            )}`
          );
        }

        if (options.dryRun) {
          const reason = forceRefresh ? 'refresh' : 'new';
          out(
            `  ${chalk.yellow('○')} ${source.name} ${chalk.dim(
              `(${connName})`
            )} — ${chalk.yellow(`would build (${reason})`)} → ${tableName}`
          );
          totalBuilt++;
          continue;
        }

        // Build the table
        const startTime = Date.now();
        try {
          await withDuckdbLockRetry(async () => {
            const connection = await malloyConfig.connections.lookupConnection(
              connName
            );
            await createTableFromSelect(connection, source, tableName, sql);
          });

          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          manifest.update(buildId, {tableName});
          out(
            `  ${chalk.green('✓')} ${source.name} ${chalk.dim(
              `(${connName})`
            )} — ${chalk.green('built')} ${chalk.dim(
              `(${elapsed}s)`
            )} → ${tableName}`
          );
          totalBuilt++;
        } catch (e) {
          out(
            `  ${chalk.red('✗')} ${source.name} ${chalk.dim(
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
