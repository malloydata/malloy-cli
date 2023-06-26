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

import {Command} from 'commander';
import {createCLI} from '../../src/cli';
import path from 'path';

let cli: Command;
let args: string[];
beforeEach(() => {
  cli = createCLI();

  const configPath = path.resolve(
    path.join(__dirname, '..', 'files', 'simple_config.json')
  );

  args = ['--quiet', '--config', configPath];
});

async function runWith(...testArgs): Promise<Command> {
  return cli.parseAsync([...args, ...testArgs], {from: 'user'});
}

describe('commands', () => {
  describe('connections', () => {
    describe('test', () => {
      it('tests a BigQuery connection', async () => {
        await runWith('connections', 'test', 'x');
      });

      it('does not have a default BigQuery connection one is configured', async () => {
        expect.assertions(1);
        return runWith('connections', 'test', 'bigquery').catch(e =>
          expect(e.message).toMatch(
            'A connection named bigquery could not be found'
          )
        );
      });

      it('tests a DuckDB default connection', async () => {
        await runWith('connections', 'test', 'duckdb');
      });

      it('fails test with a bad connection name', async () => {
        expect.assertions(1);
        return runWith('connections', 'test', 'y').catch(e =>
          expect(e.message).toMatch('A connection named y could not be found')
        );
      });
    });
  });
});
