# .github — CONTEXT.md

CI (`test.yaml`), npm release (`npm-publish.yml`), and Dependabot (`dependabot.yml`).
Non-obvious things; the YAML says what each step runs.

## The CI permission gate is intentional — never bypass it

`test.yaml` runs on `pull_request_target`, which executes in the base-repo context *with
secrets* (the `BIGQUERY_KEY` the live-backend suite needs). Its first step,
`malloydata/check-ci-permissions`, hard-fails in ~5s for any actor without write access —
**including `dependabot[bot]` and fork PRs**. That red is by design: auto-running an
untrusted PR's code (a transitive dep's install script) with the BigQuery key is the
supply-chain hole the gate closes.

The check reads `github.triggering_actor`, so a maintainer clicking **"Re-run jobs"**
becomes the actor and the real suite runs. **The re-run IS the approval.** Do not add a
`dependabot[bot]` exception — that re-opens the hole. Normal Dependabot flow: bot PR lands
red → maintainer re-runs to vouch → green → merge.

Tell: a `test-all` that fails in ~5s was rejected at the gate (tests never ran); a
multi-minute run got past it.

## Dependabot grouping rationale

Group order matters — a dep lands in the *first* matching group.

- **Majors stay OUT of the weekly `minor-and-patch` group.** One breaking major (e.g. a lib
  that ships a breaking change in a *minor*, as logform did at 2.7) would otherwise make the
  whole weekly pile unmergeable. Ungrouped majors arrive as individual PRs, handled
  deliberately.
- **`@duckdb/*` is its own group.** Not because it's the only native connector — Databricks
  pulls a native addon too (`@databricks/sql` → `lz4`, transitively via
  `@malloydata/malloy-connections`). DuckDB is special because it's the only dep whose
  per-platform binaries are *direct* deps: standalone-binary packaging forces every
  `@duckdb/node-bindings-{platform}` into `optionalDependencies` (see root `CONTEXT.md`), so
  one bump fragments into 8 separate Dependabot PRs. Transitive native bits like `lz4` never
  fragment, so they need no group. The group collapses the 8 into one PR; the exact
  prerelease pins (`1.5.3-r.2`) also keep them out of the minor/patch pile.
- **`toolchain` majors are grouped.** `gts` is a meta-package pinning
  `eslint`/`@typescript-eslint`/`prettier`/`typescript`, so their *majors* must move together
  or none lints. Minors/patches fall through to the weekly pile.

Gotchas:
- Pushing a commit onto a Dependabot PR branch (e.g. to fold in a fix for a semver-breaking
  bump) makes Dependabot **stop managing** it — no more rebases/recreates. Fine right before
  merge.
- Stale superseded PRs squat on `open-pull-requests-limit` slots and block new ones
  ("Dependabot cannot open any more pull requests"). Close them promptly.

## npm publish cuts a release on every merge

`npm-publish.yml` publishes `@next` on **every push to `main`**, so each merge — including
each Dependabot merge — ships a `@next`. Weekly grouping keeps that to ~1/week. `@latest` is
manual only (`workflow_dispatch`, patch bump, behind the `malloy-ci-npm-publisher` app token).
