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

import {Command} from '@commander-js/extra-typings';
import {createCLI} from '../../src/cli';
import path from 'path';
import {errorMessage} from '../../src/util';
import fs from 'fs';
import os from 'os';
import * as log from '../../src/log';

let cli: Command;
let originalXDG: string | undefined;

function setTestConfig(configFixture: string): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'malloy-cli-test-'));
  const malloyDir = path.join(tempDir, 'malloy');
  fs.mkdirSync(malloyDir, {recursive: true});
  fs.copyFileSync(configFixture, path.join(malloyDir, 'malloy-config.json'));
  process.env['XDG_CONFIG_HOME'] = tempDir;
  return tempDir;
}

function setEmptyConfig(): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'malloy-cli-test-'));
  const malloyDir = path.join(tempDir, 'malloy');
  fs.mkdirSync(malloyDir, {recursive: true});
  fs.writeFileSync(
    path.join(malloyDir, 'malloy-config.json'),
    JSON.stringify({connections: {}}, null, 2)
  );
  process.env['XDG_CONFIG_HOME'] = tempDir;
  return tempDir;
}

function readConfig(tempDir: string): Record<string, unknown> {
  return JSON.parse(
    fs.readFileSync(path.join(tempDir, 'malloy', 'malloy-config.json'), 'utf-8')
  );
}

function cleanupTempDir(tempDir: string): void {
  fs.rmSync(tempDir, {recursive: true, force: true});
}

async function runWith(...testArgs: string[]): Promise<Command> {
  cli = createCLI();
  return cli.parseAsync(['--quiet', ...testArgs], {from: 'user'});
}

const mergedConfigPath = path.resolve(
  path.join(__dirname, '..', 'files', 'merged_config.json')
);

describe('commands', () => {
  beforeEach(() => {
    originalXDG = process.env['XDG_CONFIG_HOME'];
  });

  afterEach(() => {
    if (originalXDG !== undefined) {
      process.env['XDG_CONFIG_HOME'] = originalXDG;
    } else {
      delete process.env['XDG_CONFIG_HOME'];
    }
  });

  describe('connections', () => {
    describe('test', () => {
      it('tests a BigQuery connection', async () => {
        const tempDir = setTestConfig(mergedConfigPath);
        try {
          await runWith('connections', 'test', 'bigquery');
        } finally {
          cleanupTempDir(tempDir);
        }
      });

      it('tests a DuckDB connection', async () => {
        const tempDir = setTestConfig(mergedConfigPath);
        try {
          await runWith('connections', 'test', 'duckdb');
        } finally {
          cleanupTempDir(tempDir);
        }
      });

      it('fails test with a bad connection name', async () => {
        const tempDir = setTestConfig(mergedConfigPath);
        expect.assertions(1);
        try {
          return await runWith('connections', 'test', 'noexist').catch(e =>
            expect(errorMessage(e)).toMatch(
              'A connection named noexist could not be found'
            )
          );
        } finally {
          cleanupTempDir(tempDir);
        }
      });
    });

    describe('create', () => {
      let tempDir: string;

      beforeEach(() => {
        tempDir = setEmptyConfig();
      });

      afterEach(() => {
        cleanupTempDir(tempDir);
      });

      it('creates a DuckDB connection with databasePath', async () => {
        await runWith(
          'connections',
          'create',
          'duckdb',
          'mydb',
          'databasePath=/tmp/foo.db'
        );

        const configContent = readConfig(tempDir);
        const connections = configContent.connections as Record<
          string,
          Record<string, unknown>
        >;
        expect(connections['mydb']).toBeDefined();
        expect(connections['mydb'].is).toBe('duckdb');
        expect(connections['mydb'].databasePath).toBe('/tmp/foo.db');
      });

      it('creates a DuckDB connection with motherDuckToken', async () => {
        await runWith(
          'connections',
          'create',
          'duckdb',
          'md-test',
          'databasePath=md:my_database',
          'motherDuckToken=tok123'
        );

        const configContent = readConfig(tempDir);
        const connections = configContent.connections as Record<
          string,
          Record<string, unknown>
        >;
        expect(connections['md-test']).toBeDefined();
        expect(connections['md-test'].is).toBe('duckdb');
        expect(connections['md-test'].databasePath).toBe('md:my_database');
        expect(connections['md-test'].motherDuckToken).toBe('tok123');
      });

      it('creates a BigQuery connection', async () => {
        await runWith(
          'connections',
          'create',
          'bigquery',
          'bq',
          'projectId=my-project',
          'location=US'
        );

        const configContent = readConfig(tempDir);
        const connections = configContent.connections as Record<
          string,
          Record<string, unknown>
        >;
        expect(connections['bq']).toBeDefined();
        expect(connections['bq'].is).toBe('bigquery');
        expect(connections['bq'].projectId).toBe('my-project');
        expect(connections['bq'].location).toBe('US');
      });

      it('errors on unknown connection type', async () => {
        expect.assertions(1);
        await runWith('connections', 'create', 'bogus-type', 'mydb').catch(e =>
          expect(errorMessage(e)).toMatch('Unknown connection type: bogus-type')
        );
      });

      it('parses boolean property correctly', async () => {
        await runWith(
          'connections',
          'create',
          'duckdb',
          'mydb',
          'readOnly=true'
        );

        const configContent = readConfig(tempDir);
        const connections = configContent.connections as Record<
          string,
          Record<string, unknown>
        >;
        expect(connections['mydb'].readOnly).toBe(true);
      });

      it('errors on duplicate connection name', async () => {
        await runWith(
          'connections',
          'create',
          'duckdb',
          'mydb',
          'databasePath=/tmp/foo.db'
        );
        expect.assertions(1);
        await runWith(
          'connections',
          'create',
          'duckdb',
          'mydb',
          'databasePath=/tmp/bar.db'
        ).catch(e =>
          expect(errorMessage(e)).toMatch(
            'A connection named mydb already exists'
          )
        );
      });

      it('handles values containing equals signs', async () => {
        await runWith(
          'connections',
          'create',
          'duckdb',
          'mydb',
          'setupSQL=SET x=1'
        );

        const configContent = readConfig(tempDir);
        const connections = configContent.connections as Record<
          string,
          Record<string, unknown>
        >;
        expect(connections['mydb'].setupSQL).toBe('SET x=1');
      });
    });

    describe('update', () => {
      let tempDir: string;

      beforeEach(() => {
        tempDir = setEmptyConfig();
      });

      afterEach(() => {
        cleanupTempDir(tempDir);
      });

      it('updates an existing connection', async () => {
        await runWith(
          'connections',
          'create',
          'duckdb',
          'mydb',
          'databasePath=/tmp/foo.db'
        );
        await runWith(
          'connections',
          'update',
          'mydb',
          'workingDirectory=/tmp/work'
        );

        const configContent = readConfig(tempDir);
        const connections = configContent.connections as Record<
          string,
          Record<string, unknown>
        >;
        expect(connections['mydb'].databasePath).toBe('/tmp/foo.db');
        expect(connections['mydb'].workingDirectory).toBe('/tmp/work');
      });

      it('errors on non-existent connection', async () => {
        expect.assertions(1);
        await runWith(
          'connections',
          'update',
          'noexist',
          'databasePath=/tmp/foo.db'
        ).catch(e =>
          expect(errorMessage(e)).toMatch(
            'A connection named noexist could not be found'
          )
        );
      });
    });

    describe('show', () => {
      let tempDir: string;

      beforeEach(() => {
        tempDir = setEmptyConfig();
      });

      afterEach(() => {
        cleanupTempDir(tempDir);
      });

      it('errors on unknown property and shows properties list', async () => {
        expect.assertions(2);
        await runWith(
          'connections',
          'create',
          'duckdb',
          'mydb',
          'unknownProp=val'
        ).catch(e => {
          const msg = errorMessage(e);
          expect(msg).toMatch('Unknown property "unknownProp"');
          expect(msg).toMatch('databasePath');
        });
      });
    });

    describe('describe', () => {
      let tempDir: string;

      beforeEach(() => {
        tempDir = setEmptyConfig();
      });

      afterEach(() => {
        cleanupTempDir(tempDir);
      });

      it('lists available types with no argument', async () => {
        const output: string[] = [];
        const outSpy = jest
          .spyOn(log, 'out')
          .mockImplementation((msg: string) => {
            output.push(msg);
          });

        try {
          await runWith('connections', 'describe');
        } finally {
          outSpy.mockRestore();
        }

        const combined = output.join('');
        expect(combined).toContain('duckdb');
        expect(combined).toContain('bigquery');
      });

      it('shows properties for a specific type', async () => {
        const output: string[] = [];
        const outSpy = jest
          .spyOn(log, 'out')
          .mockImplementation((msg: string) => {
            output.push(msg);
          });

        try {
          await runWith('connections', 'describe', 'duckdb');
        } finally {
          outSpy.mockRestore();
        }

        const combined = output.join('');
        expect(combined).toContain('databasePath');
        expect(combined).toContain('motherDuckToken');
        expect(combined).toContain('readOnly');
      });

      it('errors on unknown type', async () => {
        expect.assertions(1);
        await runWith('connections', 'describe', 'bogus').catch(e =>
          expect(errorMessage(e)).toMatch('Unknown connection type: bogus')
        );
      });
    });

    describe('show', () => {
      let tempDir: string;

      beforeEach(() => {
        tempDir = setEmptyConfig();
      });

      afterEach(() => {
        cleanupTempDir(tempDir);
      });

      it('masks password fields in show output', async () => {
        await runWith(
          'connections',
          'create',
          'duckdb',
          'mydb',
          'databasePath=md:my_database',
          'motherDuckToken=secret-token'
        );

        const output: string[] = [];
        const outSpy = jest
          .spyOn(log, 'out')
          .mockImplementation((msg: string) => {
            output.push(msg);
          });

        try {
          await runWith('connections', 'show', 'mydb');
        } finally {
          outSpy.mockRestore();
        }

        const combined = output.join('');
        expect(combined).toContain('****');
        expect(combined).not.toContain('secret-token');
      });
    });
  });
});
