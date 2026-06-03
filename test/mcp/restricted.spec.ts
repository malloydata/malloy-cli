/* Copyright Contributors to the Malloy project / SPDX-License-Identifier: MIT */

import path from 'path';
import fs from 'fs';
import os from 'os';
import {createBasicLogger, silenceOut} from '../../src/log';
import {loadConfig} from '../../src/config';
import '../../src/connections/connection_manager';
import {
  extractDescription,
  resolveHandle,
  listModels,
  describeModel,
  compileRestricted,
  runRestricted,
} from '../../src/mcp/restricted';

// Inline-SQL sources keep the models self-contained — no CSV fixtures, no
// working-directory dependency. `orders` is defined via duckdb.sql so it
// doubles as the "a model field defined with connection.sql is still
// referenceable from restricted text" regression.
const PUBLISHED = `##|(mcp-description)
Orders for the test shop.
Two line description.
|##
source: orders is duckdb.sql("SELECT 1 as id, 10 as amount UNION ALL SELECT 2 as id, 20 as amount")
`;

const NESTED = `##(mcp-description) Nested model.
source: nums is duckdb.sql("SELECT 1 as v UNION ALL SELECT 2 as v")
`;

const SECRET = `source: secret is duckdb.sql("SELECT 1 as x")
`;

const GIVENS_MODEL = `##! experimental.givens
##|(mcp-description)
Model with a given.
|##
given:
  TARGET :: number is 0
source: nums is duckdb.sql("SELECT 1 as v UNION ALL SELECT 2 as v UNION ALL SELECT 3 as v")
`;

describe('restricted MCP mode', () => {
  let originalXDG: string | undefined;
  let tempDir: string;
  let root: string;

  beforeAll(async () => {
    originalXDG = process.env['XDG_CONFIG_HOME'];
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'malloy-cli-restricted-'));
    const malloyDir = path.join(tempDir, 'malloy');
    fs.mkdirSync(malloyDir, {recursive: true});
    fs.writeFileSync(
      path.join(malloyDir, 'malloy-config.json'),
      JSON.stringify({connections: {duckdb: {is: 'duckdb'}}})
    );
    process.env['XDG_CONFIG_HOME'] = tempDir;

    root = path.join(tempDir, 'models');
    fs.mkdirSync(path.join(root, 'sub'), {recursive: true});
    fs.mkdirSync(path.join(root, '.hidden'), {recursive: true});
    fs.writeFileSync(path.join(root, 'published.malloy'), PUBLISHED);
    fs.writeFileSync(path.join(root, 'sub', 'nested.malloy'), NESTED);
    fs.writeFileSync(path.join(root, 'secret.malloy'), SECRET);
    fs.writeFileSync(path.join(root, 'givens_model.malloy'), GIVENS_MODEL);
    // A marked model saved with CRLF line endings must still publish.
    fs.writeFileSync(
      path.join(root, 'crlf.malloy'),
      PUBLISHED.replace(/\n/g, '\r\n')
    );
    // A marked model inside a hidden dir is excluded from the walk — and must
    // also be unreachable, so listing and reachability stay in lockstep.
    fs.writeFileSync(path.join(root, '.hidden', 'buried.malloy'), PUBLISHED);

    createBasicLogger();
    await loadConfig();
    silenceOut();
  });

  afterAll(() => {
    if (originalXDG !== undefined) {
      process.env['XDG_CONFIG_HOME'] = originalXDG;
    } else {
      delete process.env['XDG_CONFIG_HOME'];
    }
    fs.rmSync(tempDir, {recursive: true, force: true});
  });

  describe('extractDescription', () => {
    it('reads a multi-line block body', () => {
      expect(extractDescription(PUBLISHED)).toBe(
        'Orders for the test shop.\nTwo line description.'
      );
    });

    it('reads a single-line marker', () => {
      expect(extractDescription(NESTED)).toBe('Nested model.');
    });

    it('returns undefined when unmarked', () => {
      expect(extractDescription(SECRET)).toBeUndefined();
    });
  });

  describe('listModels', () => {
    it('lists only marked models, with descriptions, nested handles', () => {
      const models = listModels(root);
      const byHandle = Object.fromEntries(
        models.map(m => [m.handle, m.description])
      );
      expect(Object.keys(byHandle).sort()).toEqual([
        'crlf.malloy',
        'givens_model.malloy',
        'published.malloy',
        'sub/nested.malloy',
      ]);
      expect(byHandle['secret.malloy']).toBeUndefined();
      expect(byHandle['.hidden/buried.malloy']).toBeUndefined();
      expect(byHandle['published.malloy']).toBe(
        'Orders for the test shop.\nTwo line description.'
      );
      expect(byHandle['sub/nested.malloy']).toBe('Nested model.');
    });
  });

  describe('resolveHandle', () => {
    it('accepts a marked model (including nested and CRLF)', () => {
      expect(resolveHandle(root, 'published.malloy')).toHaveProperty('abs');
      expect(resolveHandle(root, 'sub/nested.malloy')).toHaveProperty('abs');
      expect(resolveHandle(root, 'crlf.malloy')).toHaveProperty('abs');
    });

    it.each([
      ['unmarked model', 'secret.malloy'],
      ['parent traversal', '../escape.malloy'],
      ['absolute path', '/etc/passwd'],
      ['missing file', 'nope.malloy'],
      ['hidden-dir model', '.hidden/buried.malloy'],
    ])('rejects %s as model-not-found', (_label, handle) => {
      const res = resolveHandle(root, handle);
      expect(res).not.toHaveProperty('abs');
      if ('problem' in res) {
        expect(res.problem.code).toBe('model-not-found');
      }
    });
  });

  describe('describe_model', () => {
    it('returns the curated surface of a published model', async () => {
      const res = await describeModel(root, 'published.malloy');
      expect(res.ok).toBe(true);
      expect(res.model?.sources.map(s => s.name)).toContain('orders');
    });

    it('refuses an unpublished model', async () => {
      const res = await describeModel(root, 'secret.malloy');
      expect(res.ok).toBe(false);
      expect(res.problems[0].code).toBe('model-not-found');
    });
  });

  describe('compileRestricted', () => {
    it('accepts a clean query', async () => {
      const res = await compileRestricted(
        root,
        'published.malloy',
        'run: orders -> { aggregate: total is amount.sum() }'
      );
      expect(res.problems.filter(p => p.severity === 'error')).toEqual([]);
      expect(res.ok).toBe(true);
    });

    it.each([
      ['import', 'import "secret.malloy"\nrun: orders -> { select: id }'],
      ['connection.table', "run: duckdb.table('x') -> { select: a }"],
      ['connection.sql', 'run: duckdb.sql("select 1 as a") -> { select: a }'],
      ['sql_ function', 'run: orders -> { select: n is sql_number("1") }'],
      ['##! flag', '##! experimental.foo\nrun: orders -> { select: id }'],
    ])('rejects %s with restricted-construct-forbidden', async (_l, query) => {
      const res = await compileRestricted(root, 'published.malloy', query);
      expect(res.ok).toBe(false);
      expect(
        res.problems.some(p => p.code === 'restricted-construct-forbidden')
      ).toBe(true);
    });

    // `given:` needs the experimental flag the model enables; without it the
    // feature gate fires before the restricted check, so test it against the
    // givens-enabled model.
    it('rejects a given: declaration with restricted-construct-forbidden', async () => {
      const res = await compileRestricted(
        root,
        'givens_model.malloy',
        'given: X :: number is 1\nrun: nums -> { select: v }'
      );
      expect(res.ok).toBe(false);
      expect(
        res.problems.some(p => p.code === 'restricted-construct-forbidden')
      ).toBe(true);
    });

    it('reports multiple violations in one compile', async () => {
      const res = await compileRestricted(
        root,
        'published.malloy',
        'import "secret.malloy"\nrun: duckdb.table(\'x\') -> { select: a }'
      );
      const restricted = res.problems.filter(
        p => p.code === 'restricted-construct-forbidden'
      );
      expect(restricted.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('runRestricted', () => {
    it('runs a clean query referencing a connection.sql-defined source', async () => {
      const res = await runRestricted(
        root,
        'published.malloy',
        'run: orders -> { aggregate: total is amount.sum() }'
      );
      expect(res.ok).toBe(true);
      expect(res.rowCount).toBe(1);
      expect((res.rows?.[0] as {total: number}).total).toBe(30);
    });

    it('threads givens through to the query', async () => {
      const res = await runRestricted(
        root,
        'givens_model.malloy',
        'run: nums -> { select: v; where: v = $TARGET }',
        {givens: {TARGET: 2}}
      );
      expect(res.ok).toBe(true);
      expect(res.rowCount).toBe(1);
      expect((res.rows?.[0] as {v: number}).v).toBe(2);
    });

    it('refuses a forbidden construct at run time', async () => {
      const res = await runRestricted(
        root,
        'published.malloy',
        "run: duckdb.table('x') -> { select: a }"
      );
      expect(res.ok).toBe(false);
      expect(
        res.problems.some(p => p.code === 'restricted-construct-forbidden')
      ).toBe(true);
    });
  });
});
