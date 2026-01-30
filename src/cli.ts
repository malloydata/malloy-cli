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

import {Command, Option} from '@commander-js/extra-typings';
import {runCommand} from './commands/run';
import {loadConfig} from './config';
//import {configShowCommand as showConfigCommand} from './commands/config';
import {
  createBigQueryConnectionCommand,
  createDuckDbConnectionCommand,
  createPostgresConnectionCommand,
  createPrestoConnectionCommand,
  createSnowflakeConnectionCommand,
  createTrinoConnectionCommand,
  listConnectionsCommand,
  removeConnectionCommand,
  showConnectionCommand,
  testConnectionCommand,
} from './commands/connections';
import {createBasicLogger, silenceOut} from './log';
import {loadConnections} from './connections/connection_manager';
import {showThirdPartyCommand} from './commands/third_party';
import {compileCommand} from './commands/compile';

const compileDescription = `compile a Malloy file (.malloy or .malloysql)

When compiling a MalloySQL file, all statements in the file are compiled sequentially.
If --index is passed, the statement at that 1-based index is compiled. If this statement
is a SQL statement, all Malloy statements (but no SQL statements) above that statement are
also compiled.

When compiling a query using a Malloy file....`;

const afterCompileHelp = `

Examples:

Compile a MalloySQL file and output SQL:
compile file.malloysql -o malloy compiled-sql

Compile a MalloySQL file and output each statement as SQL using JSON:
compile file.malloysql -f json`;

const runDescription = `execute a Malloy file (.malloy or .malloysql)

When executing a MalloySQL file, all statements in the file are executed sequentially.
If --index is passed, the statement at that 1-based index is executed. If this statement
is a SQL statement, all Malloy statements (but no SQL statements) above that statement are
also executed.

When executing a Malloy file, include either a name to a query (--name), the index of a
query (--index), or a new query as the final argument.`;

const afterRunHelp = `

Examples:

Run a MalloySQL file and output the malloy, the compiled SQL, and results:
run file.malloysql -o malloy compiled-sql results

Run a MalloySQL file and output each statement as SQL:
run file.malloysql -f json

Run the second MalloySQL statement in a file and output the results:
run file.malloysql --index 2 -o results

Run a Malloy query using file.malloy and output the results as JSON:
run file.malloy "source->{ aggregate: my_field }"`;

export function createCLI(): Command {
  const cli = new Command()
    // global options
    .version(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (<any>process).MALLOY_CLI_VERSION
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (<any>process).MALLOY_CLI_VERSION
        : 'development'
    )
    .name('malloy-cli')
    .addOption(
      new Option('-c, --config <file_path>', 'path to a config.json file').env(
        'MALLOY_CONFIG_FILE'
      )
    )
    .addOption(new Option('--quiet', 'silence output'))
    .addOption(new Option('-d, --debug', 'print debug-level logs to stdout'))
    .addOption(
      new Option('-l, --log-level <level>', 'log level')
        .choices(['error', 'warn', 'info', 'debug'] as const)
        .default('warn' as const)
    );

  if (process.env.NODE_ENV === 'test') {
    // silence output and don't process.exit(1) when testing

    // NOTE! exitOverride is copied to commands upon command creation, so setting
    // this after a command is created will mean that command does NOT have the exit
    // overridden. Feels like a bug with Commander but whatever we can solve by
    // setting here before any subcommands are created.
    cli.exitOverride();
    cli.configureOutput({
      outputError: () => {},
    });
  } else {
    // Red "Error:" if exiting with error
    // TODO some parse errors also output "error:", strip that
    cli.configureOutput({
      outputError: (str, write) => write(`\x1b[31mError:\x1b[0m ${str}`),
    });
  }

  // config, logging, connections
  cli.hook('preAction', (_thisCommand, _actionCommand) => {
    // if packaged, respect debug flag, but if not, debug = true
    if (cli.opts().debug) createBasicLogger('debug');
    else createBasicLogger(cli.opts().logLevel);

    if (cli.opts().quiet) silenceOut();

    loadConfig(cli.opts().config);
    loadConnections();
  });

  cli
    .command('compile <file>')
    .argument(
      '[query]',
      'a quoted query to be compiled (for .malloy files only)'
    )
    .addOption(
      new Option(
        '-i, --index <number>',
        'only run statement or query at index i (1-based)'
      )
        .conflicts('query-name')
        .argParser(parseFloat)
    )
    .addOption(
      new Option(
        '-n, --name <name>',
        'run a named query (.malloy file only)'
      ).conflicts('index')
    )
    .addOption(new Option('-j, --json', 'output json'))
    .summary('compile a Malloy file (.malloy or .malloysql)')
    .description(compileDescription)
    .addHelpText('after', afterCompileHelp)
    .action(compileCommand);

  cli
    .command('run <file>')
    .argument(
      '[query]',
      'a quoted query to be executed (for .malloy files only)'
    )
    .addOption(
      new Option(
        '-i, --index <number>',
        'only run statement or query at index i (1-based)'
      )
        .conflicts('query-name')
        .argParser(parseFloat)
    )
    .addOption(
      new Option(
        '-n, --name <name>',
        'run a named query (.malloy file only)'
      ).conflicts('index')
    )
    .addOption(new Option('-j, --json', 'output json'))
    .summary('execute a Malloy file (.malloy or .malloysql)')
    .description(runDescription)
    .addHelpText('after', afterRunHelp)
    .action(runCommand);

  const connections = cli
    .command('connections')
    .description('manage connection configuration');

  connections
    .command('list')
    .description('list all database connections')
    .action(listConnectionsCommand);

  connections
    .command('create-bigquery')
    .description('add a new BigQuery database connection')
    .argument('<name>')
    .addOption(new Option('-p, --project <id>'))
    .addOption(new Option('-l, --location <region>').default('US'))
    .option('-k, --service-account-key-path <path>')
    .addOption(new Option('-t, --timeout <milliseconds>').argParser(parseInt))
    .addOption(
      new Option('-m, --maximum-bytes-billed <bytes>').argParser(parseInt)
    )
    .action(createBigQueryConnectionCommand);

  connections
    .command('create-postgres')
    .description('add a new Postgres database connection')
    .argument('<name>')
    .option('-h, --host <url>')
    .option('-u, --username <name>')
    .addOption(new Option('-P, --port <number>').argParser(parseInt))
    .option('-d, --database <name>')
    .option('-p, --password <password>')
    .action(createPostgresConnectionCommand);

  connections
    .command('create-duckdb')
    .description('add a new DuckDB database connection')
    .argument('<name>')
    .addOption(
      new Option(
        '--database-path <database>',
        'path to DuckDB database file or MotherDuck database (e.g., "md:my_database")'
      )
    )
    .addOption(
      new Option('--mother-duck-token <token>', 'MotherDuck API token').env(
        'MOTHERDUCK_TOKEN'
      )
    )
    .action(createDuckDbConnectionCommand);

  connections
    .command('create-snowflake')
    .description('add a new Snowflake database connection')
    .argument('<name>')
    .addOption(new Option('-a, --account <account>').makeOptionMandatory())
    .option('-u --username <name>')
    .option('-p, --password <password>')
    .option('-w, --warehouse <warehouse>')
    .option('-d, --database <name>')
    .option('-s, --schema <schema>')
    .addOption(
      new Option('-t, --timeout-ms <milliseconds>').argParser(parseInt)
    )
    .action(createSnowflakeConnectionCommand);

  connections
    .command('create-presto')
    .description('add a new Presto database connection')
    .argument('<name>')
    .option('-S, --server <server>')
    .addOption(new Option('-P, --port <number>').argParser(parseInt))
    .option('-c, --catalog <catalog>')
    .option('-s, --schema <schema>')
    .option('-u, ---user <user>')
    .option('-p, --password <password>')
    .action(createPrestoConnectionCommand);

  connections
    .command('create-trino')
    .description('add a new Trino database connection')
    .argument('<name>')
    .option('-S, --server <server>')
    .addOption(new Option('-P, --port <number>').argParser(parseInt))
    .option('-c, --catalog <catalog>')
    .option('-s, --schema <schema>')
    .option('-u, ---user <user>')
    .option('-p, --password <password>')
    .action(createTrinoConnectionCommand);

  connections
    .command('test')
    .description('test a database connection')
    .argument('<name>')
    .action(testConnectionCommand);

  connections
    .command('show')
    .description('show details for a database connection')
    .argument('<name>')
    .action(showConnectionCommand);

  // TODO should this be connection-specific?
  // connections.command('update').description('update a database connection');

  connections
    .command('delete')
    .description('remove a database connection')
    .argument('<name>')
    .action(removeConnectionCommand);

  // cli
  //   .command('config')
  //   .description('output the current config')
  //   .action(showConfigCommand);

  cli
    .command('third-party')
    .description('output third party license information')
    .action(showThirdPartyCommand);

  return cli;
}

export const cli = createCLI();
export async function run() {
  await cli.parseAsync(process.argv);
}
