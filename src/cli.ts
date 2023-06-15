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

// some options to consider:
// truncateResults
// abortOnExecitionError
// outputFile
// debug
// verbosity

// TODO quiet vs thrown errors
// TODO update logger before running any commands
// TODO run named malloy query

const cli = new Command();

// global
cli
  .version('0.0.1')
  .addOption(
    new Option('-c, --config <file_path>', 'path to a config.json file').env(
      'MALLOY_CONFIG_FILE'
    )
  )
  .addOption(new Option('-q, --quiet', 'silence output'))
  .addOption(new Option('-d, --debug', 'print debug-level logs to stdout'));

// commands
// TODO optional statement index
cli
  .command('run <file>')
  .description('execute a Malloy file (.malloy or .malloysql)')
  .action(runCommand);

// TODO optional statement index
cli
  .command('compile <file>')
  .description(
    'compile a Malloy file (.malloy or .malloysql) and output resulting SQL'
  )
  .action(runCommand);

// config, logging
cli.hook('preAction', (_thisCommand, _actionCommand) => {
  loadConfig(cli.opts().config);

  // TODO update logger w config + passed settings

  // TODO start connection factory
});

async function run() {
  cli.parse(process.argv);
}

export {run, cli};
