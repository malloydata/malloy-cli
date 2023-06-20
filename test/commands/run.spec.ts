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

  args = ['-q', '--config', configPath];
});

async function runWith(...testArgs): Promise<Command> {
  return cli.parseAsync([...args, ...testArgs], {from: 'user'});
}

describe('commands', () => {
  describe('run', () => {
    it('runs malloysql', async () => {
      await runWith(
        'run',
        path.resolve(path.join(__dirname, '..', 'files', 'simple.malloysql'))
      );
    });

    it('fails if index is < 1', async () => {
      expect.assertions(1);
      return runWith('run', '-i', '0', 'file.malloy').catch(e =>
        expect(e.message).toMatch('Index must be greater than 0')
      );
    });

    it('fails if index and query name are both passed', async () => {
      expect.assertions(1);
      return runWith('run', '-i', '1', '-n', 'queryName', 'file.malloy').catch(
        e =>
          expect(e.message).toMatch(
            "error: option '-n, --query-name <name>' cannot be used with option '-i, --index <number>"
          )
      );
    });
  });
});
