# malloy-cli — CONTEXT.md

Thin CLI on top of `@malloydata/malloy` and `@malloydata/malloy-connections`. Published as
`@malloydata/cli` (npm) and as a standalone `pkg`-built binary.

This file lists things that aren't obvious from reading the code: invariants, silent
gotchas, decisions whose rationale isn't in any commit message, cross-cutting "don't do
this" warnings. For layout, scripts, deps, etc. — read the tree. CI, release, and Dependabot
specifics live in `.github/CONTEXT.md`.

## Build output filename quirk

`package.json` lists `bin: dist/index.js`, but the actual esbuild output is `dist/cli.js`
(see `scripts/build.ts`). Both the bin field and the build script are correct in their own
worlds; don't "fix" one to match the other without checking the packaging pipeline.

## Configuration

The CLI is a thin adapter on core's `MalloyConfig` system (malloy ≥ 0.0.373). Core handles
overlay refs (`{env: "..."}`, `{config: "..."}`), property defaults from the connection
registry, `includeDefaultConnections` fabrication, walk-up discovery, and warning logs. The
CLI only owns: file-path resolution, the on-disk read-modify-write loop for
`connections create/update/delete`, and old-format migration. **If a config bug touches
overlay resolution, property defaults, or discovery, the fix belongs in core, not here.**

### Invariants — do not break these

1. **`includeDefaultConnections: true` is forced** in `loadConfigFromFile` after parsing
   the POJO. Reason: existing setups expect `duckdb.table(...)` to work even if the config
   only mentions postgres. This replaced an earlier CLI-side `withRegistryFallback` shim;
   `connection_manager.ts` is now just a side-effect import.

2. **Side-effect import order.** `src/connections/connection_manager.ts` does
   `import '@malloydata/malloy-connections'`, which registers every db-* type. Must run
   before any `MalloyConfig` is constructed, or `includeDefaultConnections` produces
   nothing. `cli.ts` imports it before `loadConfig` runs — keep it that way.

3. **`--config` deliberately does NOT set `rootDirectory`.** "Use this file" doesn't imply
   "this is the project root." Only `--projectDir` sets it. DuckDB's `workingDirectory`
   defaults to `{config: 'rootDirectory'}` via the registry, so this distinction controls
   where relative paths in Malloy files resolve.

4. **`configURL` must be passed whenever a config file is loaded** (typed second arg:
   `new MalloyConfig(pojo, {configURL})`). Core derives `manifestURL` and `givensURL` from
   it; forget it → both are `undefined` and the CLI falls back to cwd.

5. **`malloyConfig` is a mutable module singleton.** `loadConfig` reassigns it; everything
   else imports the live binding. Don't change to `const`. The teardown in `cli.ts:run()`
   calls `releaseConnections()` in a `finally` (guarded) so mysql can drain its socket
   pool — without this, the process hangs.

6. **`testConnectionCommand` builds its own `MalloyConfig`** from one entry's raw POJO and
   releases it after. Don't unify with the singleton — that would force-load every other
   connection just to test one.

### Read-modify-write for `connections create/update/delete`

These commands edit the raw on-disk JSON (`readConfigPojo` → mutate → `saveConfig`), not
the resolved `MalloyConfig`. Reason: the resolved config has overlay refs already
substituted, so round-tripping would replace `{env: "PG_PASSWORD"}` with the literal value
on disk. `saveConfig` re-reads the file before writing so any non-`connections` top-level
fields are preserved.

## Persistence (`build` command)

Core gives three primitives — annotation (`#@ persist`), build plan
(`model.getBuildPlan()`), and compile-time substitution via `BuildManifest`. The CLI is one
opinionated implementation; the VS Code extension is the other (it consumes manifests the
CLI writes). When changing behavior here, align with the primitives — don't reinvent
dependency tracking or caching in the CLI layer.

CLI-specific conventions, in order of how-likely-to-bite-you:

- **`#@ persist name=schema.table` silently fails** — `.` is a path separator in the tag
  parser. Dotted names must be quoted: `name="schema.table"`. Parse errors come back
  through `getBuildPlan().tagParseLog`; the CLI prints them. Easy to miss in review.
- **`name=` is required.** The CLI uses it as the destination table name. Missing → error.
- **DDL is `DROP TABLE IF EXISTS … ; CREATE TABLE … AS …`.** Fails when the user has
  CREATE but not DELETE — affects Trino/Presto via BigQuery proxy. See
  `createTableFromSelect`. Known limitation, no fix queued.
- **Write `manifest.activeEntries`, never `buildManifest` directly.** Only entries
  `update()`-d or `touch()`-ed during this build are written; stale entries from prior
  builds are pruned. Writing `buildManifest` defeats GC.
- **Strict-mode policy.** New manifests are created with `strict: true`. If an existing
  manifest has `strict: false`, the CLI does NOT silently re-enable it. Strict means a
  missing entry for a `#@ persist` source throws at compile time instead of silently
  falling through to inline SQL — important for production setups.
- **`EMPTY_BUILD_MANIFEST`** (exported from `@malloydata/malloy`) suppresses substitution
  per-query — the way to get raw inline SQL when a manifest is wired in.

Status: persistence is experimental, gated by `##! experimental.persistence` at the top of
any file using `#@ persist`. Files without that pragma are skipped silently.

## Connection-backend traps

- **DuckDB native bindings.** Uses `@duckdb/node-api` + `@duckdb/node-bindings-{platform}`
  (NOT the legacy `duckdb` package). The published `package.json`'s `optionalDependencies`
  must list every platform binding so npm picks the right one at install. The build chain
  enforces this: `scripts/utils/fetch-duckdb.ts` reads bindings from
  `@duckdb/node-bindings/package.json`; `scripts/package-npm.ts` syncs them into the
  published manifest. If you add a duckdb-related script, preserve that flow.

- **Snowflake.** The Snowflake SDK reads `~/.snowflake/connections.toml` automatically —
  but only if `connOptions` is `undefined`. Malloy's factory strips `is` from props so
  `{snowflake: {is: "snowflake"}}` (or no entry, via registry fallback) gets the TOML path.
  Don't add property fallbacks that pass `{}` instead of `undefined`; you'll silently
  disable TOML auth.

## Updating Malloy packages

`npm run malloy-update` bumps every `@malloydata/*` dep to the latest published version.
It is not a plain `npm update` — three steps in order:
1. `npm install --save-exact $(./scripts/malloy-packages.ts latest)` — pins each
   `@malloydata/*` devDependency to its exact `latest` version. `malloy-packages.ts`
   enumerates the package names from `package.json` so the list never drifts.
2. `ts-node scripts/sync-duckdb.ts` — re-pins `@duckdb/node-api`, `@duckdb/node-bindings`,
   and every `@duckdb/node-bindings-{platform}` optional dep to whatever version the newly
   installed `@malloydata/db-duckdb`'s `@duckdb/node-api` wants. Keeping these in lockstep
   is what stops the standalone binary from loading a mismatched native lib.
3. A final `npm install` to reconcile the lockfile.

`malloy-update-next` is the same against the `next` (pre-release) tag. After either, run
`npm run lint && npm run build && npm run test-silent`; if you touched DuckDB, also
build + smoke-test the standalone binary (see Packaging below). The malloy packages move
in lockstep — don't bump one in isolation.

## Packaging — Node version pin

The repo, CI, and npm-publish all run on **Node 24** (`.node-version`, `engines: >=20`,
the workflow `node-version` fields). The *standalone binary* embeds its own Node runtime,
built with **`@yao-pkg/pkg`** (the maintained fork of the archived Vercel `pkg`) and a
`node24` target in `scripts/package.ts`. yao-pkg requires Node ≥ 22 to *run* — moving the
repo to Node 24 is what unblocked it; on Node 20 it hit an ESM-interop bug. The base
runtime comes from `@yao-pkg/pkg-fetch`, which ships node24 binaries for all five targets
(macos/linux/win × x64/arm64). Smoke-testing the built binary shows `process.version`
`v24.15.0`.

Cross-target builds (`--all-targets`, or any `--platform` ≠ host) need the matching
DuckDB binding force-installed first — npm's `os`/`cpu` filters skip non-host
`@duckdb/node-bindings-*` packages, so `resolveDuckDBNative` can't find them. The common
path is a host-only build (`npm run package`), which just works.

Alternatives to yao-pkg evaluated 2026-03 and rejected:
- Node SEA — no native-addon support, kills DuckDB.
- `bun build --compile` — DuckDB fails (oven-sh/bun#17312), plus BigQuery HTTP-compat
  issues.

**Decision: leave as-is until it breaks.** No good single-binary alternative currently
exists for projects with native `.node` addons.

**DuckDB shared lib must be bundled as a `pkg` asset.** Since DuckDB 1.4 the native
binding ships as `duckdb.node` *plus* an adjacent shared library
(`libduckdb.dylib`/`.so`, `duckdb.dll`); the `.node` looks for it via `@loader_path`.
`pkg` auto-extracts `.node` files but not the sibling lib, so the binary builds clean and
then dies at first DuckDB use with `Library not loaded`. The `pkg.assets` glob in
`package.json` ships the lib so it lands next to the extracted `.node`. Keep that glob.
**Always smoke-test the binary with a real query (`run: duckdb.sql("""SELECT 1""")`), not
`--version`** — `--version` never touches DuckDB and hides this failure.

## Copyright headers

Every source file carries the canonical short SPDX header:

```
/*
 * Copyright Contributors to the Malloy project
 * SPDX-License-Identifier: MIT
 */
```

(equivalent comment styles for other languages). New files use it as-is; don't
reintroduce the old long-form Google header. The original `Copyright 2023 Google
LLC` MIT notice is preserved verbatim in `LICENSE` under "HISTORICAL
ATTRIBUTIONS & NOTICES" — per-file authorship lives in the git history.
