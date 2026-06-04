/*
 * Copyright Contributors to the Malloy project
 * SPDX-License-Identifier: MIT
 */

import {Command} from '@commander-js/extra-typings';
import {createCLI} from '../../src/cli';
import path from 'path';
import {errorMessage} from '../../src/util';
import fs from 'fs';
import os from 'os';

let cli: Command;
let tempDir: string;
let originalXDG: string | undefined;

beforeEach(() => {
  cli = createCLI();

  originalXDG = process.env['XDG_CONFIG_HOME'];

  const configFixture = path.resolve(
    path.join(__dirname, '..', 'files', 'merged_config.json')
  );
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'malloy-cli-test-'));
  const malloyDir = path.join(tempDir, 'malloy');
  fs.mkdirSync(malloyDir, {recursive: true});
  fs.copyFileSync(configFixture, path.join(malloyDir, 'malloy-config.json'));
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

async function runWith(...testArgs: string[]): Promise<Command> {
  return cli.parseAsync(['--quiet', ...testArgs], {from: 'user'});
}

describe('commands', () => {
  describe('run', () => {
    it('runs BigQuery malloysql', async () => {
      await runWith(
        'run',
        path.resolve(path.join(__dirname, '..', 'files', 'bigquery.malloysql'))
      );
    });

    it('runs DuckDB malloysql', async () => {
      await runWith(
        'run',
        path.resolve(path.join(__dirname, '..', 'files', 'duckdb.malloysql'))
      );
    });

    it('fails if index is < 1', async () => {
      expect.assertions(1);
      return await runWith('run', '-i', '0', 'file.malloy').catch(e =>
        expect(errorMessage(e)).toMatch(
          'Statement indexes are 1-based - did you mean to use 1 instead of 0?'
        )
      );
    });

    it('accepts --givens with inline JSON on a malloy file that uses one', async () => {
      await runWith(
        'run',
        path.resolve(path.join(__dirname, '..', 'files', 'givens_test.malloy')),
        '--givens',
        '{"TARGET":2}'
      );
    });

    it('accepts --givens @file', async () => {
      const givensFile = path.join(tempDir, 'givens.json');
      fs.writeFileSync(givensFile, '{"TARGET":3}');
      await runWith(
        'run',
        path.resolve(path.join(__dirname, '..', 'files', 'givens_test.malloy')),
        '--givens',
        `@${givensFile}`
      );
    });

    it('rejects malformed --givens JSON', async () => {
      expect.assertions(1);
      return await runWith(
        'run',
        path.resolve(path.join(__dirname, '..', 'files', 'givens_test.malloy')),
        '--givens',
        '{not json'
      ).catch(e => expect(errorMessage(e)).toMatch(/invalid JSON/));
    });

    it('rejects non-object --givens JSON', async () => {
      expect.assertions(1);
      return await runWith(
        'run',
        path.resolve(path.join(__dirname, '..', 'files', 'givens_test.malloy')),
        '--givens',
        '[1,2]'
      ).catch(e => expect(errorMessage(e)).toMatch(/expected a JSON object/));
    });

    it('fails if index and query name are both passed', async () => {
      expect.assertions(1);
      return await runWith(
        'run',
        '-i',
        '1',
        '-n',
        'queryName',
        'file.malloy'
      ).catch(e =>
        expect(errorMessage(e)).toMatch(
          "error: option '-n, --name <name>' cannot be used with option '-i, --index <number>"
        )
      );
    });
  });
});
