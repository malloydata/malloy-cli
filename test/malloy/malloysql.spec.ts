/*
 * Copyright Contributors to the Malloy project
 * SPDX-License-Identifier: MIT
 */

import path from 'path';
import fs from 'fs';
import os from 'os';
import {runMalloySQL} from '../../src/malloy/malloySQL';
import {createBasicLogger, silenceOut} from '../../src/log';
import {QueryOptionsType} from '../../src/malloy/util';
import {errorMessage} from '../../src/util';
import '../../src/connections/connection_manager';
import {loadConfig} from '../../src/config';

const duckdbMalloySQL = path.join(__dirname, '..', 'files', 'duckdb.malloysql');
const complex1 = path.join(
  __dirname,
  '..',
  'files',
  'malloysql_complex_1.malloysql'
);

const testFilesDir = path.resolve(path.join(__dirname, '..', 'files'));

describe('MalloySQL', () => {
  let originalXDG: string | undefined;
  let tempDir: string;

  beforeAll(async () => {
    originalXDG = process.env['XDG_CONFIG_HOME'];
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'malloy-cli-test-'));
    const malloyDir = path.join(tempDir, 'malloy');
    fs.mkdirSync(malloyDir, {recursive: true});
    // DuckDB resolves relative paths from workingDirectory (which defaults
    // to cwd when no rootDirectory overlay is set). The test model files
    // use relative CSV paths, so we set workingDirectory explicitly.
    fs.writeFileSync(
      path.join(malloyDir, 'malloy-config.json'),
      JSON.stringify({
        connections: {
          duckdb: {is: 'duckdb', workingDirectory: testFilesDir},
        },
      })
    );
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

  it('runs MalloySQL, outputs results', async () => {
    expect(
      await runMalloySQL(duckdbMalloySQL, {
        compileOnly: false,
        json: true,
      })
    ).toStrictEqual('{"statement_0":{"sql":"SELECT 1;","results":[{"1":1}]}}');
  });

  it('runs MalloySQL, gets JSON', async () => {
    expect(
      JSON.parse(
        await runMalloySQL(duckdbMalloySQL, {
          compileOnly: false,
          json: true,
        })
      )
    ).toStrictEqual({statement_0: {sql: 'SELECT 1;', results: [{1: 1}]}});
  });

  it('compiles MalloySQL, gets JSON', async () => {
    expect(
      JSON.parse(
        await runMalloySQL(duckdbMalloySQL, {
          compileOnly: true,
          json: true,
        })
      )
    ).toStrictEqual({statement_0: {sql: 'SELECT 1;'}});
  });

  it('errors when index is beyond', async () => {
    expect.assertions(1);
    return await runMalloySQL(duckdbMalloySQL, {
      compileOnly: false,
      json: false,
      queryOptions: {
        type: QueryOptionsType.Index,
        index: 2,
      },
    }).catch(e => {
      expect(errorMessage(e)).toStrictEqual(
        'Statement index 2 is greater than number of possible statements 1'
      );
    });
  });

  it('errors when index is 0', async () => {
    expect.assertions(1);
    return await runMalloySQL(duckdbMalloySQL, {
      compileOnly: false,
      json: false,
      queryOptions: {
        type: QueryOptionsType.Index,
        index: 0,
      },
    }).catch(e => {
      expect(errorMessage(e)).toStrictEqual(
        'Statement indexes are 1-based - did you mean to use 1 instead of 0?'
      );
    });
  });

  // TODO move to duckdb, make faster
  it('handles multiple embedded malloy statements in same sql statement', async () => {
    return await runMalloySQL(complex1, {
      compileOnly: false,
      json: false,
    });
  });

  it('handles multiple malloy statements', async () => {
    // TODO
  });

  // TODO
  // output
  // embedded w parens
  // embedded without parens
});
