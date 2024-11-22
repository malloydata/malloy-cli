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

let cli: Command;
let args: string[];

const bigQueryConfigPath = path.resolve(
  path.join(__dirname, '..', 'files', 'bigquery_config.json')
);

const duckDBConfigPath = path.resolve(
  path.join(__dirname, '..', 'files', 'duckdb_config.json')
);

async function runWith(...testArgs: string[]): Promise<Command> {
  cli = createCLI();

  args = ['--quiet'];
  return cli.parseAsync([...args, ...testArgs], {from: 'user'});
}

describe('commands', () => {
  describe('connections', () => {
    describe('test', () => {
      it('tests a BigQuery connection', async () => {
        await runWith('-c', bigQueryConfigPath, 'connections', 'test', 'x');
      });

      it('tests a DuckDB connection', async () => {
        await runWith('-c', duckDBConfigPath, 'connections', 'test', 'y');
      });

      it('does not have a default BigQuery connection one is configured', async () => {
        expect.assertions(1);
        return await runWith(
          '-c',
          bigQueryConfigPath,
          'connections',
          'test',
          'bigquery'
        ).catch(e =>
          expect(errorMessage(e)).toMatch(
            'A connection named bigquery could not be found'
          )
        );
      });

      it('tests a DuckDB default connection', async () => {
        await runWith(
          '-c',
          bigQueryConfigPath,
          'connections',
          'test',
          'duckdb'
        );
      });

      it('fails test with a bad connection name', async () => {
        expect.assertions(1);
        return await runWith(
          '-c',
          bigQueryConfigPath,
          'connections',
          'test',
          'y'
        ).catch(e =>
          expect(errorMessage(e)).toMatch(
            'A connection named y could not be found'
          )
        );
      });
    });
  });
});
