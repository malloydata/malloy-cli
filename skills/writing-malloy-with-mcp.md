---
description: How to iteratively write Malloy using the MCP tools. Read this once; it describes the tool surface and the compile→run loop.
---
# Writing Malloy with the CLI MCP Server

This CLI exposes five tools. "Compile" means parse + typecheck + build the model — the successful output is a **structured description** of what's in the source, not just SQL. "Run" means actually execute and return rows.

## Tools

| Tool            | Input                                  | What it does                                                                   |
|-----------------|----------------------------------------|--------------------------------------------------------------------------------|
| `compile_file`  | `{ uri, expand? }`                     | Fetch+compile a .malloy file; returns structured model with problems[].        |
| `compile`       | `{ source, base_uri?, expand? }`       | Same, on an inline source string.                                              |
| `run_file`      | `{ uri, name?, index? }`               | Execute one run: from a file. `name` wins over `index`; else last run:.        |
| `run`           | `{ source, base_uri? }`                | Execute the final run: from an inline source.                                  |
| `list_runs`     | `{ uri }`                              | Cheap discovery: runnable run: + named queries, no model serialization.        |

Every tool returns a uniform `problems[]` with `{ severity, message, code, uri?, line, column, endLine?, endColumn? }`. Compile errors, import-resolution errors, and runtime SQL errors all use this shape.

## Compile result shape

```jsonc
{
  "ok": true,
  "model": {
    "rootUri": "file:///.../flights.malloy",
    "annotations": ["## ..."],         // top-level model annotations
    "sources": [
      {
        "name": "flights",
        "annotations": ["# bar_chart"],
        "location": {...},
        "primaryKey": "id",
        "dimensions": [{ "name", "type", "expression", "annotations", "location" }],
        "measures":   [{ "name", "type", "expression", "annotations", "location" }],
        "views":      [{ "name", "expression", "annotations", "location" }],
        "joins":      [
          // Join to a named source → reference by source_ref:
          { "name": "carriers", "kind": "join", "relationship": "one", "source_ref": "carriers" },
          // Anonymous record / array → inline fields:
          { "name": "tags", "kind": "join", "relationship": "many",
            "fields": [{ "name": "each", "kind": "dimension", "type": "string" }] }
        ]
      }
    ],
    "queries": [{ "name": "top_carriers", "annotations": [...], "location": {...} }],
    "runs":    [{ "index": 0, "name": "optional", "sql": "SELECT ...", "annotations": [...] }]
  },
  "problems": []
}
```

**Joins are rendered by reference by default.** If you need to know what fields a referenced source has, look it up in the same response's `model.sources[]` by name. Pass `expand: "inline"` if you want the sub-schema duplicated in place.

**Scalar arrays** (like `tags: string[]`) render as a join with `relationship: "many"` and a single sub-field called `each`. Write `tags.each` to reference them.

## The iteration loop

1. Start with `compile_file` to see what's in an existing model. Look at `model.sources[]`, their measures, views, joins.
2. Draft a query — usually `import "that_file"` plus a new `run:` — and call `compile` on it. If `ok: false`, inspect `problems[]`, fix, repeat. Don't guess syntax — the compiler is ground truth.
3. When compile is clean, call `run` (or `run_file` if the query is already in a file) to get the rows.

## The import pattern

When the user has an existing `.malloy` file and wants a new query against it, don't retype their source. Write a small document that imports theirs:

```malloy
import "their_model.malloy"

run: their_source -> { ... }
```

Feed that whole thing to `compile`. Imports resolve against `base_uri` if supplied, otherwise against the inline source's synthetic URL (so imports must be absolute unless `base_uri` is given — usually pass the directory of the target file as `base_uri`).

## Common errors and how they're reported

- **Unknown field** — check `model.sources[].dimensions` / `.measures` / `.views` / `.joins` for what actually exists. If you see `source_ref`, look up the referenced source in the same response.
- **Aggregate locality** — `sum(joined.x)` across a join boundary requires explicit locality: `source.sum(joined.x)` or `joined.x.sum()`.
- **Mixed reduction/projection** — a single stage uses either `group_by:`/`aggregate:` OR `select:`, not both.
- **Calculation in source** — `calculate:` (window functions) only lives in queries, never in source definitions.

## Before writing non-trivial Malloy

Pull the `malloy-language-reference` prompt first. The language has real scoping and typing rules that the compiler will enforce; don't guess.
