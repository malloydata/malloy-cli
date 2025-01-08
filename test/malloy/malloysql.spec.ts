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
import {runMalloySQL} from '../../src/malloy/malloySQL';
import {createBasicLogger, silenceOut} from '../../src/log';
import {QueryOptionsType} from '../../src/malloy/util';
import {errorMessage} from '../../src/util';
import {loadConnections} from '../../src/connections/connection_manager';
import {loadConfig} from '../../src/config';

const duckdbMalloySQL = path.join(__dirname, '..', 'files', 'duckdb.malloysql');
const complex1 = path.join(
  __dirname,
  '..',
  'files',
  'malloysql_complex_1.malloysql'
);

describe('MalloySQL', () => {
  beforeAll(() => {
    // call 'preAction' hooks
    // so that things like logger, connectionManager are created
    createBasicLogger();
    loadConfig();
    loadConnections();
    silenceOut();
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
