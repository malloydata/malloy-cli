/* Copyright Contributors to the Malloy project / SPDX-License-Identifier: MIT */

import {prettifyMalloy} from '../../src/malloy/prettify';

describe('prettifyMalloy', () => {
  it('reformats messy whitespace', () => {
    const src = "run:duckdb.sql('select 1')->{select:* }";
    const {formatted, errors} = prettifyMalloy(src);
    expect(errors).toEqual([]);
    expect(formatted).toContain("run: duckdb.sql('select 1') -> {");
    expect(formatted).toContain('select: *');
  });

  it('is idempotent on already-formatted source', () => {
    const src = "run:duckdb.sql('select 1')->{select:* }";
    const once = prettifyMalloy(src).formatted;
    const twice = prettifyMalloy(once).formatted;
    expect(twice).toBe(once);
  });

  it('reports parse errors with line/column', () => {
    const {errors} = prettifyMalloy('source: x is %%');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toEqual(
      expect.objectContaining({
        line: expect.any(Number),
        column: expect.any(Number),
        message: expect.any(String),
      })
    );
  });
});
