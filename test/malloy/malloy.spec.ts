/*
 * Copyright 2023 Google LLC
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files
 * (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import path from 'path';
import fs from 'fs';
import os from 'os';
import {config, loadConfig} from '../../src/config';
import {loadConnections} from '../../src/connections/connection_manager';
import {createBasicLogger, silenceOut} from '../../src/log';

const configFixture = path.resolve(
  path.join(__dirname, '..', 'files', 'merged_config.json')
);

describe('Malloy', () => {
  let originalXDG: string | undefined;
  let tempDir: string;

  beforeAll(() => {
    originalXDG = process.env['XDG_CONFIG_HOME'];
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'malloy-cli-test-'));
    const malloyDir = path.join(tempDir, 'malloy');
    fs.mkdirSync(malloyDir, {recursive: true});
    fs.copyFileSync(configFixture, path.join(malloyDir, 'malloy-config.json'));
    process.env['XDG_CONFIG_HOME'] = tempDir;

    createBasicLogger();
    loadConfig();
    loadConnections(config);
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
});
