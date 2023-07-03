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
import {createCLI} from '../../src/cli';
import {runMalloySQL} from '../../src/malloy/malloySQL';
import {silenceOut} from '../../src/log';

const duckdbMalloySQL = path.join(__dirname, '..', 'files', 'duckdb.malloysql');

describe('MalloySQL', () => {
  beforeAll(() => {
    const cli = createCLI();
    // call 'preAction' hooks
    // so that things like logger, connectionManager are created
    const preAction: [Function] = cli['_lifeCycleHooks']['preAction'];
    preAction.forEach(action => action.call(cli));

    silenceOut();
  });

  it('runs MalloySQL, outputs results', async () => {
    expect(await runMalloySQL(duckdbMalloySQL, null, false)).toStrictEqual(
      '{"statement_0":{"sql":"SELECT 1;","results":[{"1":1}]}}'
    );
  });

  it('runs MalloySQL, gets JSON', async () => {
    expect(
      JSON.parse(await runMalloySQL(duckdbMalloySQL, null, false, true))
    ).toStrictEqual({statement_0: {sql: 'SELECT 1;', results: [{1: 1}]}});
  });

  it('compiles MalloySQL, gets JSON', async () => {
    expect(
      JSON.parse(await runMalloySQL(duckdbMalloySQL, null, true, true))
    ).toStrictEqual({statement_0: {sql: 'SELECT 1;'}});
  });

  it('errors when index is beyond', async () => {
    expect.assertions(1);
    runMalloySQL(duckdbMalloySQL, 2).catch(e => {
      expect(e.message).toStrictEqual(
        'Statement index 2 is greater than number of possible statements 1'
      );
    });
  });

  it('errors when index is 0', async () => {
    expect.assertions(1);
    runMalloySQL(duckdbMalloySQL, 0).catch(e => {
      expect(e.message).toStrictEqual(
        'Statement indexes are 1-based - did you mean to use 1 instead of 0?'
      );
    });
  });

  // output
  // multi-malloy
  // multi-embedded-malloy
  // embedded w parens
  // embedded without parens
});
