/* Copyright Contributors to the Malloy project / SPDX-License-Identifier: MIT */

import path from 'path';
import fs from 'fs';
import os from 'os';
import {buildFiles, BuildOptions} from '../../src/malloy/build';
import {createBasicLogger, silenceOut} from '../../src/log';
import '../../src/connections/connection_manager';
import {loadConfig, malloyConfig} from '../../src/config';

const TEST_DATA = path.join(__dirname, '..', 'files');
const AUTO_RECALLS_CSV = path.join(TEST_DATA, 'auto_recalls.csv');

let tempDir: string;
let modelDir: string;
let originalXDG: string | undefined;

function writeModel(filename: string, content: string): string {
  const filePath = path.join(modelDir, filename);
  fs.writeFileSync(filePath, content);
  return filePath;
}

interface ManifestFile {
  entries: Record<string, {tableName: string}>;
  strict: boolean;
}

function manifestFilePath(): string {
  return path.join(tempDir, 'malloy', 'MANIFESTS', 'malloy-manifest.json');
}

function readManifest(): ManifestFile {
  const p = manifestFilePath();
  if (!fs.existsSync(p)) return {entries: {}, strict: false};
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

async function runBuild(
  paths: string[],
  options?: Partial<BuildOptions>
): Promise<void> {
  await buildFiles(paths, {
    refresh: new Set(),
    dryRun: false,
    ...options,
  });
}

// Model with two persist sources
function modelV1(): string {
  return `##! experimental.persistence

source: recalls is duckdb.table('${AUTO_RECALLS_CSV}') extend {
  measure: recall_count is count()
}

#@ persist name=by_manufacturer
source: by_manufacturer is recalls -> {
  group_by: Manufacturer
  aggregate: recall_count
}

#@ persist name=by_type
source: by_type is recalls -> {
  group_by: \`Recall Type\`
  aggregate: recall_count
}
`;
}

// Model v2: drop by_type, add by_year
function modelV2(): string {
  return `##! experimental.persistence

source: recalls is duckdb.table('${AUTO_RECALLS_CSV}') extend {
  measure: recall_count is count()
}

#@ persist name=by_manufacturer
source: by_manufacturer is recalls -> {
  group_by: Manufacturer
  aggregate: recall_count
}

#@ persist name=by_year
source: by_year is recalls -> {
  group_by: recall_year is year(\`Report Received Date\`)
  aggregate: recall_count
}
`;
}

// Model with persist but no name
function modelNoName(): string {
  return `##! experimental.persistence

source: recalls is duckdb.table('${AUTO_RECALLS_CSV}') extend {
  measure: recall_count is count()
}

#@ persist
source: by_manufacturer is recalls -> {
  group_by: Manufacturer
  aggregate: recall_count
}
`;
}

// Model with no persist sources
function modelNoPersist(): string {
  return `##! experimental.persistence

source: recalls is duckdb.table('${AUTO_RECALLS_CSV}') extend {
  measure: recall_count is count()
}
`;
}

// Model without experimental.persistence flag
function modelNoFlag(): string {
  return `source: recalls is duckdb.table('${AUTO_RECALLS_CSV}') extend {
  measure: recall_count is count()
}
`;
}

describe('build command', () => {
  beforeAll(async () => {
    originalXDG = process.env['XDG_CONFIG_HOME'];
    createBasicLogger();
    silenceOut();
  });

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'malloy-cli-build-'));
    modelDir = path.join(tempDir, 'models');
    fs.mkdirSync(modelDir, {recursive: true});

    // Set up config with duckdb connection
    const malloyDir = path.join(tempDir, 'malloy');
    fs.mkdirSync(malloyDir, {recursive: true});
    fs.writeFileSync(
      path.join(malloyDir, 'malloy-config.json'),
      JSON.stringify({connections: {duckdb: {is: 'duckdb'}}})
    );
    process.env['XDG_CONFIG_HOME'] = tempDir;

    await loadConfig();
  });

  afterEach(() => {
    fs.rmSync(tempDir, {recursive: true, force: true});
  });

  afterAll(() => {
    if (originalXDG !== undefined) {
      process.env['XDG_CONFIG_HOME'] = originalXDG;
    } else {
      delete process.env['XDG_CONFIG_HOME'];
    }
  });

  describe('dry run', () => {
    it('reports sources that would be built', async () => {
      const file = writeModel('test.malloy', modelV1());
      await runBuild([file], {dryRun: true});

      // Dry run should not write a manifest
      const manifest = readManifest();
      expect(Object.keys(manifest.entries)).toHaveLength(0);
    });

    it('skips files without experimental.persistence', async () => {
      const file = writeModel('test.malloy', modelNoFlag());
      // Should not throw
      await runBuild([file], {dryRun: true});
    });

    it('skips files with no persist sources', async () => {
      const file = writeModel('test.malloy', modelNoPersist());
      // Should not throw
      await runBuild([file], {dryRun: true});
    });
  });

  describe('building', () => {
    it('builds two persist sources and writes manifest', async () => {
      const file = writeModel('test.malloy', modelV1());
      await runBuild([file]);

      const manifest = readManifest();
      const names = Object.values(manifest.entries).map(e => e.tableName);
      expect(names).toContain('by_manufacturer');
      expect(names).toContain('by_type');
      expect(Object.keys(manifest.entries)).toHaveLength(2);
    });

    it('incremental build: unchanged source is skipped, new source is built', async () => {
      const file = writeModel('test.malloy', modelV1());
      await runBuild([file]);

      const manifest1 = readManifest();
      const names1 = Object.values(manifest1.entries).map(e => e.tableName);
      expect(names1).toContain('by_manufacturer');
      expect(names1).toContain('by_type');

      // Reload config to get a fresh manifest (simulates a new CLI invocation)
      await loadConfig();

      // Change the model: drop by_type, add by_year
      writeModel('test.malloy', modelV2());
      await runBuild([file]);

      const manifest2 = readManifest();
      const names2 = Object.values(manifest2.entries).map(e => e.tableName);
      expect(names2).toContain('by_manufacturer');
      expect(names2).toContain('by_year');
      expect(names2).not.toContain('by_type');
      expect(Object.keys(manifest2.entries)).toHaveLength(2);
    });

    it('rebuilds when the database file is missing even if manifest says up-to-date', async () => {
      // Repro of the user-reported "build succeeds with checkmarks but no
      // data" bug: manifest entries persist across CLI invocations, but if
      // the database file has gone missing (rm, restored backup without
      // data/, machine move, etc.) the cli currently trusts the manifest,
      // skips DROP/CREATE, and exits successfully — leaving an empty
      // freshly-initialized DuckDB file (12288 bytes) with no tables.
      //
      // Use a file-backed duckdb connection (the default config in this
      // suite is :memory:, which can't reproduce the bug because the
      // tables vanish with the connection anyway).
      const dbPath = path.join(tempDir, 'test.duckdb');
      const malloyDir = path.join(tempDir, 'malloy');
      fs.writeFileSync(
        path.join(malloyDir, 'malloy-config.json'),
        JSON.stringify({
          connections: {duckdb: {is: 'duckdb', databasePath: dbPath}},
        })
      );
      await loadConfig();

      const file = writeModel('test.malloy', modelV1());
      await runBuild([file]);

      // First build: tables should be in the file.
      async function tablesInDb(): Promise<string[]> {
        const conn = await malloyConfig.connections.lookupConnection('duckdb');
        const result = await conn.runSQL(
          'SELECT table_name FROM duckdb_tables() ORDER BY table_name'
        );
        return (result.rows as Array<{table_name: string}>).map(
          r => r.table_name
        );
      }
      expect(await tablesInDb()).toEqual(
        expect.arrayContaining(['by_manufacturer', 'by_type'])
      );

      // Simulate the user scenario: drop the connection so the file lock
      // is released, then delete the database file. Manifest stays.
      await malloyConfig.releaseConnections();
      fs.unlinkSync(dbPath);
      const walPath = `${dbPath}.wal`;
      if (fs.existsSync(walPath)) fs.unlinkSync(walPath);

      // Reload config so the next build starts from a clean connection cache.
      await loadConfig();
      expect(fs.existsSync(dbPath)).toBe(false);

      // Re-run the build. The cli currently prints "up to date" for every
      // source and writes nothing to the database — that's the bug. After
      // the fix, the build should detect the missing tables and rebuild.
      await runBuild([file]);

      expect(await tablesInDb()).toEqual(
        expect.arrayContaining(['by_manufacturer', 'by_type'])
      );
    });

    it('rebuild same model is all up-to-date', async () => {
      const file = writeModel('test.malloy', modelV1());
      await runBuild([file]);

      const manifest1 = readManifest();

      // Build again — nothing should change
      await runBuild([file]);

      const manifest2 = readManifest();
      expect(manifest2).toEqual(manifest1);
    });
  });

  describe('error handling', () => {
    it('errors when persist has no name', async () => {
      const file = writeModel('test.malloy', modelNoName());

      // Should not throw — errors are reported and continued
      await runBuild([file]);

      // No manifest should be written (no successful builds)
      const manifest = readManifest();
      expect(Object.keys(manifest.entries)).toHaveLength(0);
    });
  });

  describe('refresh', () => {
    it('forces rebuild of a specific table', async () => {
      const file = writeModel('test.malloy', modelV1());
      await runBuild([file]);

      const manifest1 = readManifest();
      const buildIds1 = Object.keys(manifest1.entries);
      expect(buildIds1).toHaveLength(2);

      // Rebuild with refresh on by_manufacturer
      await runBuild([file], {
        refresh: new Set(['duckdb:by_manufacturer']),
      });

      const manifest2 = readManifest();
      const names2 = Object.values(manifest2.entries).map(e => e.tableName);
      expect(names2).toContain('by_manufacturer');
      expect(names2).toContain('by_type');
      // BuildIDs should be the same (SQL didn't change)
      expect(Object.keys(manifest2.entries).sort()).toEqual(buildIds1.sort());
    });
  });

  describe('strict flag', () => {
    it('new manifest is written with strict: true', async () => {
      const file = writeModel('test.malloy', modelV1());
      await runBuild([file]);

      const manifest = readManifest();
      expect(manifest.strict).toBe(true);
      expect(Object.keys(manifest.entries).length).toBeGreaterThan(0);
    });

    it('preserves strict: false from existing manifest', async () => {
      const file = writeModel('test.malloy', modelV1());

      // First build creates manifest with strict: true
      await runBuild([file]);
      const manifest1 = readManifest();
      expect(manifest1.strict).toBe(true);

      // Manually set strict: false in the manifest file (as if user edited it)
      const patched = {...manifest1, strict: false};
      fs.writeFileSync(manifestFilePath(), JSON.stringify(patched, null, 2));

      // Reload config so the manifest is re-read from disk
      await loadConfig();

      // Change model so something actually gets built
      writeModel('test.malloy', modelV2());
      await runBuild([file]);

      const manifest2 = readManifest();
      expect(manifest2.strict).toBe(false);
    });
  });

  describe('directory scanning', () => {
    it('finds and builds .malloy files in a directory', async () => {
      writeModel('a.malloy', modelV1());
      writeModel('b.malloy', modelNoPersist());

      await runBuild([modelDir]);

      const manifest = readManifest();
      const names = Object.values(manifest.entries).map(e => e.tableName);
      expect(names).toContain('by_manufacturer');
      expect(names).toContain('by_type');
    });

    it('recursively scans subdirectories', async () => {
      const subDir = path.join(modelDir, 'sub');
      fs.mkdirSync(subDir, {recursive: true});
      fs.writeFileSync(path.join(subDir, 'nested.malloy'), modelV1());

      await runBuild([modelDir]);

      const manifest = readManifest();
      const names = Object.values(manifest.entries).map(e => e.tableName);
      expect(names).toContain('by_manufacturer');
    });

    it('defaults to current directory when no paths given', async () => {
      const origCwd = process.cwd();
      try {
        process.chdir(modelDir);
        writeModel('test.malloy', modelV1());
        await runBuild([]);

        const manifest = readManifest();
        expect(Object.keys(manifest.entries).length).toBeGreaterThan(0);
      } finally {
        process.chdir(origCwd);
      }
    });
  });
});
