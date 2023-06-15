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

import {Command, Option} from 'commander';
import {runCommand} from './commands/run';
import {loadConfig} from './config';
import {configShowCommand} from './commands/config';
import {compileCommand} from './commands/compile';
import {
  createBigQueryConnectionCommand,
  listConnectionsCommand,
  testConnectionCommand,
} from './commands/connections';
import {createBasicLogger, silenceLoggers} from './log';
import {loadConnections} from './connections/connection_manager';

// some options to consider:
// truncateResults
// abortOnExecitionError
// outputFile
// debug
// verbosity

// TODO quiet vs thrown errors
// TODO run named malloy query

const cli = new Command();

// global
cli
  .version('0.0.1')
  .addOption(
    new Option('-c, --config <file_path>', 'Path to a config.json file').env(
      'MALLOY_CONFIG_FILE'
    )
  )
  .addOption(new Option('-q, --quiet', 'Silence output'))
  .addOption(new Option('-d, --debug', 'Print debug-level logs to stdout'));

// commands
// TODO optional statement index
cli
  .command('run <file>')
  .description('Execute a Malloy file (.malloy or .malloysql)')
  .action(runCommand);

// TODO optional statement index
cli
  .command('compile <file>')
  .description(
    'Compile a Malloy file (.malloy or .malloysql) and output resulting SQL'
  )
  .action(compileCommand);

const connections = cli
  .command('connections')
  .description('Manage connection configuration');

connections
  .command('list')
  .description('List all database connections')
  .action(listConnectionsCommand);

connections
  .command('create-bigquery')
  .description('Add a new BigQuery database connection')
  .argument('<name>')
  .action(createBigQueryConnectionCommand);

connections
  .command('create-postgres')
  .description('Add a new Postgres database connection')
  .argument('<name>')
  .option('-h, --host <url>');

connections
  .command('create-duckdb')
  .description('Add a new DuckDB database connection')
  .argument('<name>')
  .option('-h, --host <url>');

connections
  .command('test')
  .description('Test a database connection')
  .argument('<name>')
  .action(testConnectionCommand);

connections
  .command('show')
  .description('Show details for a database connection');

connections.command('update').description('Update a database connection');

connections.command('delete').description('Remove a database connection');

cli
  .command('config')
  .description('Output the current config')
  .action(configShowCommand);

// config, logging
cli.hook('preAction', (_thisCommand, _actionCommand) => {
  // TODO remove
  createBasicLogger('debug');

  // if packaged, respect debug flag, but if not, debug = true
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // TODO merge w/level
  const debug = (<any>process).pkg ? cli.opts().debug : true;

  if (cli.opts().quiet) {
    silenceLoggers();
  }

  loadConfig(cli.opts().config);

  // TODO update logger w config + passed settings

  loadConnections();
});

async function run() {
  await cli.parseAsync(process.argv);
}

export {run, cli};
