/* Copyright Contributors to the Malloy project / SPDX-License-Identifier: MIT */

import fs from 'fs';
import {GivenValue} from '@malloydata/malloy';

/**
 * Parse the value of `--givens <spec>` into a name→value map suitable for
 * `query.getSQL({givens})` and `query.run({givens})`.
 *
 * Three input modes, curl-style:
 *   - `@-`          read JSON from stdin
 *   - `@path`       read JSON from a file
 *   - anything else parse as inline JSON
 *
 * The JSON must be an object (`{NAME: value, ...}`). Per-value type validity
 * against the model's declared givens is enforced by malloy core at bind
 * time; this parser only checks the outer shape.
 */
export function parseGivensSpec(
  spec: string,
  opts: {readStdin?: () => string} = {}
): Record<string, GivenValue> {
  let source: string;
  let origin: string;
  if (spec === '@-') {
    const reader = opts.readStdin ?? (() => fs.readFileSync(0, 'utf-8'));
    source = reader();
    origin = '<stdin>';
  } else if (spec.startsWith('@')) {
    const path = spec.slice(1);
    try {
      source = fs.readFileSync(path, 'utf-8');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`--givens: cannot read ${path}: ${msg}`);
    }
    origin = path;
  } else {
    source = spec;
    origin = '<inline>';
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`--givens (${origin}): invalid JSON: ${msg}`);
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(
      `--givens (${origin}): expected a JSON object of {NAME: value, ...}, got ${describeJsonShape(
        parsed
      )}`
    );
  }

  return parsed as Record<string, GivenValue>;
}

function describeJsonShape(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}
