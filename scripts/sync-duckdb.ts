#!/usr/bin/env ts-node
/* Copyright Contributors to the Malloy project / SPDX-License-Identifier: MIT */

/**
 * sync-duckdb — keep the CLI's pinned DuckDB native packages in lockstep
 * with @malloydata/db-duckdb.
 *
 * WHY THIS EXISTS
 * ---------------
 * The CLI ships as a self-contained, esbuild-bundled artifact, so DuckDB's
 * native binaries must be present at pack time. To make that happen the CLI
 * pins the @duckdb packages *directly* in its own package.json:
 *   - devDependencies:      @duckdb/node-api, @duckdb/node-bindings
 *   - optionalDependencies: the platform-specific
 *                           @duckdb/node-bindings-<os>-<arch> packages that
 *                           carry the actual `.node` binaries
 *
 * Those pins must match whatever DuckDB version @malloydata/db-duckdb pulls in.
 * If they drift, two copies of @duckdb/node-bindings get installed (the CLI's
 * stale pin at the top level, db-duckdb's newer one nested) and the esbuild
 * build externalizes the wrong, stale platform list — which fails for any
 * platform the newer DuckDB added (e.g. linux-*-musl, win32-arm64).
 *
 * HOW IT STAYS CORRECT
 * --------------------
 * The source of truth is the @duckdb packages *as db-duckdb resolves them*,
 * not the CLI's own node_modules. We resolve starting from db-duckdb's own
 * directory so we read the version db-duckdb actually depends on, whether that
 * copy is hoisted to the top level or nested under db-duckdb. The platform
 * package set (and versions) is copied verbatim from node-bindings' own
 * optionalDependencies, so platforms added by future DuckDB releases are
 * picked up automatically with no edits here.
 *
 * BEHAVIOR
 * --------
 * All resolution and validation happens before any write, so a failure leaves
 * package.json untouched. Exits 0 without writing when already in sync. On any
 * problem it prints a single actionable line and exits non-zero. Output is
 * deterministic (platform keys are sorted) so re-running never churns the diff.
 *
 * Run after updating malloy packages — `npm run malloy-update` does this.
 */
import fs from 'fs';
import path from 'path';

const PKG_PATH = path.resolve(__dirname, '..', 'package.json');
const BINDINGS_PREFIX = '@duckdb/node-bindings-';

/** The package.json fields this script reads. */
interface PackageJson {
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

/** Print one actionable line and abort without touching package.json. */
function fail(message: string): never {
  console.error(`sync-duckdb: ${message}`);
  process.exit(1);
}

/** Return a copy of `obj` with keys in sorted order, for stable output. */
function sortKeys(obj: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of Object.keys(obj).sort()) {
    out[key] = obj[key];
  }
  return out;
}

/**
 * Read a package's package.json the way @malloydata/db-duckdb would resolve
 * it — i.e. starting the module search from db-duckdb's own directory — so we
 * read the @duckdb version db-duckdb depends on, not the CLI's own pin.
 */
function readDuckDBPackage(spec: string, fromDir: string): PackageJson {
  let resolved: string;
  try {
    resolved = require.resolve(`${spec}/package.json`, {paths: [fromDir]});
  } catch {
    return fail(
      `cannot resolve ${spec} from @malloydata/db-duckdb — run \`npm install\` first`
    );
  }
  try {
    return JSON.parse(fs.readFileSync(resolved, 'utf-8')) as PackageJson;
  } catch (e) {
    return fail(`cannot read ${resolved}: ${(e as Error).message}`);
  }
}

function main(): void {
  // Anchor every @duckdb lookup at db-duckdb's directory (see file header).
  let dbDuckDBDir: string;
  try {
    dbDuckDBDir = path.dirname(
      require.resolve('@malloydata/db-duckdb/package.json')
    );
  } catch {
    return fail(
      '@malloydata/db-duckdb is not installed — run `npm install` first'
    );
  }

  const nodeApi = readDuckDBPackage('@duckdb/node-api', dbDuckDBDir);
  const nodeBindings = readDuckDBPackage('@duckdb/node-bindings', dbDuckDBDir);

  const wantedApiVersion = nodeApi.version;
  const wantedBindingsVersion = nodeBindings.version;
  if (!wantedApiVersion) {
    return fail('@duckdb/node-api package.json has no version field');
  }
  if (!wantedBindingsVersion) {
    return fail('@duckdb/node-bindings package.json has no version field');
  }

  // The canonical platform set + versions, straight from node-bindings.
  const wantedPlatforms: Record<string, string> = {};
  for (const [name, version] of Object.entries(
    nodeBindings.optionalDependencies ?? {}
  )) {
    if (name.startsWith(BINDINGS_PREFIX)) {
      wantedPlatforms[name] = version;
    }
  }
  if (Object.keys(wantedPlatforms).length === 0) {
    return fail(
      '@duckdb/node-bindings declares no platform optionalDependencies — cannot sync'
    );
  }

  // Load the CLI's package.json.
  let pkg: PackageJson;
  try {
    pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf-8')) as PackageJson;
  } catch (e) {
    return fail(`cannot read ${PKG_PATH}: ${(e as Error).message}`);
  }
  const devDeps = pkg.devDependencies ?? {};
  const currentOptional = pkg.optionalDependencies ?? {};

  // Rebuild optionalDependencies: keep any non-DuckDB-binding entries, replace
  // the DuckDB platform set wholesale with the canonical one, then sort.
  const newOptional: Record<string, string> = {};
  for (const [name, version] of Object.entries(currentOptional)) {
    if (!name.startsWith(BINDINGS_PREFIX)) {
      newOptional[name] = version;
    }
  }
  Object.assign(newOptional, wantedPlatforms);
  const sortedOptional = sortKeys(newOptional);

  const inSync =
    devDeps['@duckdb/node-api'] === wantedApiVersion &&
    devDeps['@duckdb/node-bindings'] === wantedBindingsVersion &&
    JSON.stringify(sortKeys(currentOptional)) ===
      JSON.stringify(sortedOptional);
  if (inSync) {
    console.log('@duckdb packages already in sync, no update needed');
    return;
  }

  if (devDeps['@duckdb/node-api'] !== wantedApiVersion) {
    console.log(
      `@duckdb/node-api: ${
        devDeps['@duckdb/node-api'] ?? '(absent)'
      } -> ${wantedApiVersion}`
    );
  }
  if (devDeps['@duckdb/node-bindings'] !== wantedBindingsVersion) {
    console.log(
      `@duckdb/node-bindings: ${
        devDeps['@duckdb/node-bindings'] ?? '(absent)'
      } -> ${wantedBindingsVersion}`
    );
  }

  devDeps['@duckdb/node-api'] = wantedApiVersion;
  devDeps['@duckdb/node-bindings'] = wantedBindingsVersion;
  pkg.devDependencies = devDeps;
  pkg.optionalDependencies = sortedOptional;

  fs.writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + '\n');
  console.log('Updated package.json');
}

main();
