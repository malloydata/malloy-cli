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
}

export const ResultsColors = {
  malloy: chalk.blue,
  'compiled-sql': chalk.magenta,
  results: chalk.grey,
  tasks: chalk.yellowBright,
};

export enum QueryOptionsType {
  Index = 'index',
  Name = 'name',
  String = 'string',
}

interface QueryOptionsIndex {
  type: QueryOptionsType.Index;
  index: number;
}

interface QueryOptionsName {
  type: QueryOptionsType.Name;
  name: string;
}

interface QueryOptionsString {
  type: QueryOptionsType.String;
  query: string | undefined;
}

export type QueryOptions =
  | QueryOptionsIndex
  | QueryOptionsName
  | QueryOptionsString;

export interface RunOrCompileOptions {
  compileOnly: boolean;
  queryOptions?: QueryOptions;
  json: boolean;
}

export async function runOrCompile(
  source: string,
  query: string | undefined = undefined,
  options: {
    index?: number | undefined;
    name?: string | undefined;
    json?: true | undefined;
  },
  compileOnly = false
): Promise<void> {
  const extension = path.extname(source).toLowerCase();

  if (options.index !== undefined && options.index < 1) {
    exitWithError(
      'Statement indexes are 1-based - did you mean to use 1 instead of 0?'
    );
  }

  let queryOptions: QueryOptions | undefined;
  if (query) {
    if (options.index !== undefined) {
      exitWithError(
        'Passing a query string is incompatible with also passing a query index'
      );
    }

    if (options.name !== undefined) {
      exitWithError(
        'Passing a query string is incompatible with also passing a query name'
      );
    }

    queryOptions = {
      type: QueryOptionsType.String,
      query: query,
    };
  } else if (options.index !== undefined) {
    if (options.name !== undefined) {
      exitWithError(
        'Passing a query name is incompatible with also passing a query index'
      );
    }

    // TODO verify index

    queryOptions = {
      type: QueryOptionsType.Index,
      index: options.index,
    };
  } else if (options.name) {
    queryOptions = {
      type: QueryOptionsType.Name,
      name: options.name,
    };
  }

  const runOrCompileOptions: RunOrCompileOptions = {
    compileOnly,
    json: options.json === true,
    queryOptions,
  };

  if (extension === '.malloysql') {
    await runMalloySQL(source, runOrCompileOptions);
  } else if (extension === '.malloy') {
    await runMalloy(source, runOrCompileOptions);
  } else {
    if (extension) exitWithError(`Unable to run file of type: ${extension}`);
    exitWithError(
      'Unable to determine file type - .malloy or .malloysql filetype required'
    );
  }
}

export function getFilteredResultsLogger(
  outputs: StandardOutputType[] | 'json'
) {
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
    json: (message: string) => {
      logger.log('info', message, {type: 'json'});
    },
    sql: (message: string) => {
      logger.log(
        'info',
        ResultsColors[StandardOutputType.CompiledSQL](message),
        {
          type: StandardOutputType.CompiledSQL,
        }
      );
    },
    malloy: (message: string) => {
      logger.log('info', ResultsColors[StandardOutputType.Malloy](message), {
        type: StandardOutputType.Malloy,
      });
    },
    task: (message: string) => {
      // tasks are just normal CLI output and can go through normal out logger
      // unless we're in json format
      if (sends !== 'json')
        cliLogger(ResultsColors[StandardOutputType.Tasks](message));
    },
    result: (message: string) => {
      logger.log('info', ResultsColors[StandardOutputType.Results](message), {
        type: StandardOutputType.Results,
      });
    },
    error: (message: string) => {
      if (sends === 'json') {
        logger.log('info', JSON.stringify({error: message}), {type: 'json'});
        // TODO this wonky
        if (process.env.NODE_ENV === 'test') {
          throw new Error(message);
        } else process.exit(1);
      } else {
        exitWithError(message);
      }
    },
  };
}
