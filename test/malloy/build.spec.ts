/* Copyright Contributors to the Malloy project / SPDX-License-Identifier: MIT */

import path from 'path';
import fs from 'fs';
import os from 'os';
import {buildFiles, BuildOptions} from '../../src/malloy/build';
import {createBasicLogger, silenceOut} from '../../src/log';
import {loadConnections} from '../../src/connections/connection_manager';
import {malloyConfig, loadConfig, getManifestFilePath} from '../../src/config';

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

function readManifest(): Record<string, {tableName: string}> {
  const manifestPath = getManifestFilePath();
  if (!fs.existsSync(manifestPath)) return {};
  return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
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
    loadConnections(malloyConfig);
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
      expect(Object.keys(manifest)).toHaveLength(0);
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
      const names = Object.values(manifest).map(e => e.tableName);
      expect(names).toContain('by_manufacturer');
      expect(names).toContain('by_type');
      expect(Object.keys(manifest)).toHaveLength(2);
    });

    it('incremental build: unchanged source is skipped, new source is built', async () => {
      const file = writeModel('test.malloy', modelV1());
      await runBuild([file]);

      const manifest1 = readManifest();
      const names1 = Object.values(manifest1).map(e => e.tableName);
      expect(names1).toContain('by_manufacturer');
      expect(names1).toContain('by_type');

      // Reload config to get a fresh manifest (simulates a new CLI invocation)
      await loadConfig();
      loadConnections(malloyConfig);

      // Change the model: drop by_type, add by_year
      writeModel('test.malloy', modelV2());
      await runBuild([file]);

      const manifest2 = readManifest();
      const names2 = Object.values(manifest2).map(e => e.tableName);
      expect(names2).toContain('by_manufacturer');
      expect(names2).toContain('by_year');
      expect(names2).not.toContain('by_type');
      expect(Object.keys(manifest2)).toHaveLength(2);
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
      expect(Object.keys(manifest)).toHaveLength(0);
    });
  });

  describe('refresh', () => {
    it('forces rebuild of a specific table', async () => {
      const file = writeModel('test.malloy', modelV1());
      await runBuild([file]);

      const manifest1 = readManifest();
      const buildIds1 = Object.keys(manifest1);
      expect(buildIds1).toHaveLength(2);

      // Rebuild with refresh on by_manufacturer
      await runBuild([file], {
        refresh: new Set(['duckdb:by_manufacturer']),
      });

      const manifest2 = readManifest();
      const names2 = Object.values(manifest2).map(e => e.tableName);
      expect(names2).toContain('by_manufacturer');
      expect(names2).toContain('by_type');
      // BuildIDs should be the same (SQL didn't change)
      expect(Object.keys(manifest2).sort()).toEqual(buildIds1.sort());
    });
  });

  describe('directory scanning', () => {
    it('finds and builds .malloy files in a directory', async () => {
      writeModel('a.malloy', modelV1());
      writeModel('b.malloy', modelNoPersist());

      await runBuild([modelDir]);

      const manifest = readManifest();
      const names = Object.values(manifest).map(e => e.tableName);
      expect(names).toContain('by_manufacturer');
      expect(names).toContain('by_type');
    });

    it('recursively scans subdirectories', async () => {
      const subDir = path.join(modelDir, 'sub');
      fs.mkdirSync(subDir, {recursive: true});
      fs.writeFileSync(path.join(subDir, 'nested.malloy'), modelV1());

      await runBuild([modelDir]);

      const manifest = readManifest();
      const names = Object.values(manifest).map(e => e.tableName);
      expect(names).toContain('by_manufacturer');
    });

    it('defaults to current directory when no paths given', async () => {
      const origCwd = process.cwd();
      try {
        process.chdir(modelDir);
        writeModel('test.malloy', modelV1());
        await runBuild([]);

        const manifest = readManifest();
        expect(Object.keys(manifest).length).toBeGreaterThan(0);
      } finally {
        process.chdir(origCwd);
      }
    });
  });
});
