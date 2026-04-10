/* Copyright Contributors to the Malloy project / SPDX-License-Identifier: MIT */

import path from 'path';
import fs from 'fs';
import os from 'os';
import '../src/connections/connection_manager';
import {loadConfig, malloyConfig} from '../src/config';
import {createBasicLogger, silenceOut} from '../src/log';

describe('config loading', () => {
  let originalXDG: string | undefined;
  let tempDir: string;
  let originalCwd: string;

  beforeAll(() => {
    createBasicLogger();
    silenceOut();
  });

  beforeEach(() => {
    originalXDG = process.env['XDG_CONFIG_HOME'];
    originalCwd = process.cwd();
    tempDir = fs.realpathSync(
      fs.mkdtempSync(path.join(os.tmpdir(), 'malloy-cli-config-'))
    );
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (originalXDG !== undefined) {
      process.env['XDG_CONFIG_HOME'] = originalXDG;
    } else {
      delete process.env['XDG_CONFIG_HOME'];
    }
    fs.rmSync(tempDir, {recursive: true, force: true});
  });

  describe('includeDefaultConnections injection', () => {
    // Non-project configs (--config and default global config) force
    // includeDefaultConnections: true so that all registered backends
    // are available even if the config file only lists some connections.
    // This preserves CLI backwards compatibility — duckdb.table(...)
    // works with a config that only mentions postgres.

    it('makes unmentioned backends available via --config', async () => {
      // Config only lists postgres — duckdb is not mentioned
      const configPath = path.join(tempDir, 'malloy-config.json');
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          connections: {mypostgres: {is: 'postgres', host: 'localhost'}},
        })
      );

      await loadConfig(configPath);

      // duckdb should still be resolvable because includeDefaultConnections
      // was injected
      const conn = await malloyConfig.connections.lookupConnection('duckdb');
      expect(conn).toBeDefined();
    });

    it('makes unmentioned backends available via default config', async () => {
      const malloyDir = path.join(tempDir, 'malloy');
      fs.mkdirSync(malloyDir, {recursive: true});
      fs.writeFileSync(
        path.join(malloyDir, 'malloy-config.json'),
        JSON.stringify({
          connections: {mypostgres: {is: 'postgres', host: 'localhost'}},
        })
      );
      process.env['XDG_CONFIG_HOME'] = tempDir;

      await loadConfig();

      const conn = await malloyConfig.connections.lookupConnection('duckdb');
      expect(conn).toBeDefined();
    });

    it('provides defaults even with empty config', async () => {
      const configPath = path.join(tempDir, 'malloy-config.json');
      fs.writeFileSync(configPath, JSON.stringify({connections: {}}));

      await loadConfig(configPath);

      const conn = await malloyConfig.connections.lookupConnection('duckdb');
      expect(conn).toBeDefined();
    });
  });

  describe('--projectDir mode', () => {
    it('discovers config file in the project directory', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'malloy-config.json'),
        JSON.stringify({
          connections: {mydb: {is: 'duckdb', databasePath: ':memory:'}},
        })
      );
      process.chdir(tempDir);

      await loadConfig(undefined, tempDir);

      const conn = await malloyConfig.connections.lookupConnection('mydb');
      expect(conn).toBeDefined();
    });

    it('does NOT inject includeDefaultConnections', async () => {
      // Project mode: the config file is authoritative. If you don't list
      // a connection, it should fail — not silently fall back to defaults.
      fs.writeFileSync(
        path.join(tempDir, 'malloy-config.json'),
        JSON.stringify({
          connections: {mydb: {is: 'duckdb'}},
        })
      );
      process.chdir(tempDir);

      await loadConfig(undefined, tempDir);

      await expect(
        malloyConfig.connections.lookupConnection('postgres')
      ).rejects.toThrow();
    });

    it('falls back to defaults when no config file exists', async () => {
      // No config file in tempDir — soloist experience with
      // includeDefaultConnections so basics work out of the box
      process.chdir(tempDir);

      await loadConfig(undefined, tempDir);

      const conn = await malloyConfig.connections.lookupConnection('duckdb');
      expect(conn).toBeDefined();
    });

    it('sets rootDirectory to the project directory', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'malloy-config.json'),
        JSON.stringify({connections: {duckdb: {is: 'duckdb'}}})
      );
      process.chdir(tempDir);

      await loadConfig(undefined, tempDir);

      const rootDir = malloyConfig.readOverlay('config', 'rootDirectory');
      expect(typeof rootDir).toBe('string');
      expect((rootDir as string).replace(/\/$/, '')).toContain(
        path.basename(tempDir)
      );
    });

    it('errors when cwd is outside the project directory', async () => {
      // cwd is the original test dir (not inside tempDir's subdirectory)
      const projectDir = path.join(tempDir, 'sub', 'project');
      fs.mkdirSync(projectDir, {recursive: true});
      // cwd stays at originalCwd which is outside projectDir

      await expect(loadConfig(undefined, projectDir)).rejects.toThrow(
        /not inside project directory/
      );
    });
  });
});
