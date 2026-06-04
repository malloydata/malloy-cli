/*
 * Copyright Contributors to the Malloy project
 * SPDX-License-Identifier: MIT
 */

import path from 'path';
import fs from 'fs';
import os from 'os';
import {loadConfig} from '../../src/config';
import '../../src/connections/connection_manager';
import {createBasicLogger, silenceOut} from '../../src/log';
import {runMalloy} from '../../src/malloy/malloy';

const configFixture = path.resolve(
  path.join(__dirname, '..', 'files', 'merged_config.json')
);

describe('Malloy', () => {
  let originalXDG: string | undefined;
  let tempDir: string;

  beforeAll(async () => {
    originalXDG = process.env['XDG_CONFIG_HOME'];
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'malloy-cli-test-'));
    const malloyDir = path.join(tempDir, 'malloy');
    fs.mkdirSync(malloyDir, {recursive: true});
    fs.copyFileSync(configFixture, path.join(malloyDir, 'malloy-config.json'));
    process.env['XDG_CONFIG_HOME'] = tempDir;

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

  it('runs Malloy, outputs results', () => {
    // TODO
  });

  describe('givens', () => {
    const fixture = path.resolve(
      path.join(__dirname, '..', 'files', 'givens_sql.malloy')
    );

    it('default value reaches compiled SQL when no givens supplied', async () => {
      const out = await runMalloy(fixture, {compileOnly: true, json: true});
      const {sql} = JSON.parse(out as string);
      expect(sql).toMatch(/1\s+as\s+"current_favorite"/i);
    });

    it('--givens override reaches compiled SQL', async () => {
      const out = await runMalloy(fixture, {
        compileOnly: true,
        json: true,
        givens: {favorite: 137},
      });
      const {sql} = JSON.parse(out as string);
      expect(sql).toMatch(/137\s+as\s+"current_favorite"/i);
    });
  });
});
