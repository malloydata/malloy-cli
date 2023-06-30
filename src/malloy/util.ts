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

import {transports, format, createLogger as createWinstonLogger} from 'winston';
import {TransformFunction} from 'logform';
import {out as cliLogger, silent} from '../log';
import path from 'path';
import {runMalloySQL} from '../malloy/malloySQL';
import {exitWithError} from '../util';
import {runMalloy} from '../malloy/malloy';
import chalk from 'chalk';

export enum StandardOutputType {
  Malloy = 'malloy',
  CompiledSQL = 'compiled-sql',
  Results = 'results',
  Tasks = 'tasks',
  All = 'all',
}

export const ResultsColors = {
  malloy: chalk.blue,
  'compiled-sql': chalk.magenta,
  results: chalk.grey,
  tasks: chalk.yellowBright,
};

export async function runOrCompile(
  source: string,
  options,
  compileOnly = false
): Promise<void> {
  const extension = path.extname(source).toLowerCase();

  if (options.index) {
    if (options.index < 1) exitWithError('Index must be greater than 0');
  }

  if (extension === '.malloysql') {
    if (options.queryName) {
      exitWithError('--query-name and .malloysql are not compatible');
    }

    await runMalloySQL(
      source,
      options.index,
      compileOnly,
      options.json,
      options.outputs
    );
  } else if (extension === '.malloy') {
    await runMalloy(source);
  } else {
    if (extension) exitWithError(`Unable to run file of type: ${extension}`);
    exitWithError(
      'Unable to determine file type - .malloy or .malloysql filetype required'
    );
  }
}

export function getResultsLogger(outputs: StandardOutputType[] | 'json') {
  const sends = outputs;

  const customizeOutput: TransformFunction = (info, _opts) => {
    return sends.includes(info.type) ? info : false;
  };

  const logger = createWinstonLogger({
    level: 'info',
    transports: [new transports.Console()],
    format: format.combine(
      format(customizeOutput)(),
      format.printf(({message}) => {
        return `${message}`;
      })
    ),
  });

  if (silent) logger.silent = true;

  return {
    logJSON: (message: string) => {
      logger.log('info', message, {type: 'json'});
    },
    logSQL: (message: string) => {
      logger.log(
        'info',
        ResultsColors[StandardOutputType.CompiledSQL](message),
        {
          type: StandardOutputType.CompiledSQL,
        }
      );
    },
    logMalloy: (message: string) => {
      logger.log('info', ResultsColors[StandardOutputType.Malloy](message), {
        type: StandardOutputType.Malloy,
      });
    },
    logTasks: (message: string) => {
      // tasks are just normal CLI output and can go through normal out logger
      // unless we're in json format
      if (sends !== 'json')
        cliLogger(ResultsColors[StandardOutputType.Tasks](message));
    },
    logResults: (message: string) => {
      logger.log('info', ResultsColors[StandardOutputType.Results](message), {
        type: StandardOutputType.Results,
      });
    },
  };
}

export function getErrorLogger() {}
