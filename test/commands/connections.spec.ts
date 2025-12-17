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

    describe('create-duckdb', () => {
      let tempConfigPath: string;

      beforeEach(() => {
        // Create a temporary config file for each test
        const tempDir = fs.mkdtempSync(
          path.join(os.tmpdir(), 'malloy-cli-test-')
        );
        tempConfigPath = path.join(tempDir, 'config.json');
        fs.writeFileSync(
          tempConfigPath,
          JSON.stringify({connections: []}, null, 2)
        );
      });

      afterEach(() => {
        // Clean up temporary config file
        if (tempConfigPath && fs.existsSync(tempConfigPath)) {
          const configDir = path.dirname(tempConfigPath);
          fs.unlinkSync(tempConfigPath);
          fs.rmdirSync(configDir);
        }
      });

      it('creates a DuckDB connection with motherDuckToken from command line', async () => {
        await runWith(
          '-c',
          tempConfigPath,
          'connections',
          'create-duckdb',
          'test-motherduck',
          '--database-path',
          'md:my_database',
          '--mother-duck-token',
          'test-token-123'
        );

        // Verify the connection was created with the token
        const configContent = JSON.parse(
          fs.readFileSync(tempConfigPath, 'utf-8')
        );
        const connection = configContent.connections.find(
          (c: {name: string}) => c.name === 'test-motherduck'
        );
        expect(connection).toBeDefined();
        expect(connection.backend).toBe('duckdb');
        expect(connection.databasePath).toBe('md:my_database');
        expect(connection.motherDuckToken).toBe('test-token-123');
      });

      it('creates a DuckDB connection with motherDuckToken from environment variable', async () => {
        const originalEnv = process.env.MOTHERDUCK_TOKEN;
        process.env.MOTHERDUCK_TOKEN = 'env-token-456';

        try {
          await runWith(
            '-c',
            tempConfigPath,
            'connections',
            'create-duckdb',
            'test-motherduck-env',
            '--database-path',
            'md:'
          );

          // Verify the connection was created with the token from env
          const configContent = JSON.parse(
            fs.readFileSync(tempConfigPath, 'utf-8')
          );
          const connection = configContent.connections.find(
            (c: {name: string}) => c.name === 'test-motherduck-env'
          );
          expect(connection).toBeDefined();
          expect(connection.backend).toBe('duckdb');
          expect(connection.databasePath).toBe('md:');
          expect(connection.motherDuckToken).toBe('env-token-456');
        } finally {
          // Restore original environment variable
          if (originalEnv !== undefined) {
            process.env.MOTHERDUCK_TOKEN = originalEnv;
          } else {
            delete process.env.MOTHERDUCK_TOKEN;
          }
        }
      });

      it('creates a DuckDB connection without motherDuckToken', async () => {
        // Clear any existing MOTHERDUCK_TOKEN from the environment
        const originalEnv = process.env.MOTHERDUCK_TOKEN;
        delete process.env.MOTHERDUCK_TOKEN;

        try {
          await runWith(
            '-c',
            tempConfigPath,
            'connections',
            'create-duckdb',
            'test-duckdb-local',
            '--database-path',
            '/path/to/local.duckdb'
          );

          // Verify the connection was created without the token
          const configContent = JSON.parse(
            fs.readFileSync(tempConfigPath, 'utf-8')
          );
          const connection = configContent.connections.find(
            (c: {name: string}) => c.name === 'test-duckdb-local'
          );
          expect(connection).toBeDefined();
          expect(connection.backend).toBe('duckdb');
          expect(connection.databasePath).toBe('/path/to/local.duckdb');
          expect(connection.motherDuckToken).toBeUndefined();
        } finally {
          // Restore original environment variable
          if (originalEnv !== undefined) {
            process.env.MOTHERDUCK_TOKEN = originalEnv;
          }
        }
      });
    });
  });
});
