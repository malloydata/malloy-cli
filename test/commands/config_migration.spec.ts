/*
 * Copyright Contributors to the Malloy project
 * SPDX-License-Identifier: MIT
 */

import {createCLI} from '../../src/cli';
import path from 'path';
import fs from 'fs';
import os from 'os';

let tempDir: string;
let malloyDir: string;
let originalXDG: string | undefined;

beforeEach(() => {
  originalXDG = process.env['XDG_CONFIG_HOME'];
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'malloy-cli-test-'));
  malloyDir = path.join(tempDir, 'malloy');
  fs.mkdirSync(malloyDir, {recursive: true});
  process.env['XDG_CONFIG_HOME'] = tempDir;
});

afterEach(() => {
  if (originalXDG !== undefined) {
    process.env['XDG_CONFIG_HOME'] = originalXDG;
  } else {
    delete process.env['XDG_CONFIG_HOME'];
  }
  fs.rmSync(tempDir, {recursive: true, force: true});
});

describe('config migration', () => {
  it('migrates old config.json to malloy-config.json', async () => {
    const oldConfig = {
      connections: [
        {name: 'mydb', backend: 'duckdb', databasePath: '/tmp/foo.db'},
        {
          name: 'mybq',
          backend: 'bigquery',
          isDefault: true,
          projectId: 'my-project',
        },
      ],
    };
    fs.writeFileSync(
      path.join(malloyDir, 'config.json'),
      JSON.stringify(oldConfig)
    );

    const cli = createCLI();
    await cli.parseAsync(['--quiet', 'connections', 'list'], {from: 'user'});

    // Old file should be deleted
    expect(fs.existsSync(path.join(malloyDir, 'config.json'))).toBe(false);

    // New file should exist with correct format
    const newConfigPath = path.join(malloyDir, 'malloy-config.json');
    expect(fs.existsSync(newConfigPath)).toBe(true);

    const newConfig = JSON.parse(fs.readFileSync(newConfigPath, 'utf-8'));
    expect(newConfig.connections['mydb']).toEqual({
      is: 'duckdb',
      databasePath: '/tmp/foo.db',
    });
    expect(newConfig.connections['mybq']).toEqual({
      is: 'bigquery',
      projectId: 'my-project',
    });
    // isDefault should be stripped
    expect(newConfig.connections['mybq'].isDefault).toBeUndefined();
  });

  it('does not migrate if malloy-config.json already exists', async () => {
    const oldConfig = {
      connections: [{name: 'old', backend: 'duckdb'}],
    };
    fs.writeFileSync(
      path.join(malloyDir, 'config.json'),
      JSON.stringify(oldConfig)
    );

    const newConfig = {connections: {existing: {is: 'duckdb'}}};
    fs.writeFileSync(
      path.join(malloyDir, 'malloy-config.json'),
      JSON.stringify(newConfig)
    );

    const cli = createCLI();
    await cli.parseAsync(['--quiet', 'connections', 'list'], {from: 'user'});

    // Old file should still exist (not deleted)
    expect(fs.existsSync(path.join(malloyDir, 'config.json'))).toBe(true);

    // New file should be unchanged
    const loadedConfig = JSON.parse(
      fs.readFileSync(path.join(malloyDir, 'malloy-config.json'), 'utf-8')
    );
    expect(loadedConfig.connections['existing']).toEqual({is: 'duckdb'});
    expect(loadedConfig.connections['old']).toBeUndefined();
  });

  it('works with no config file at all', async () => {
    // malloyDir exists but has no config files
    const cli = createCLI();
    await cli.parseAsync(['--quiet', 'connections', 'list'], {from: 'user'});
    // Should not crash, and should not create a config file
  });
});
