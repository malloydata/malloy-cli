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
import {StandardOutputType} from '../commands/run';
import {TransformFunction} from 'logform';
import {out as cliLogger} from '../log';

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

  return {
    logJSON: (message: string) => {
      logger.log('info', message, {type: 'json'});
    },
    logSQL: (message: string) => {
      logger.log('info', message, {type: StandardOutputType.CompiledSQL});
    },
    logMalloy: (message: string) => {
      logger.log('info', message, {type: StandardOutputType.Malloy});
    },
    logTasks: (message: string) => {
      cliLogger(message);
    },
    logResults: (message: string) => {
      logger.log('info', message, {type: StandardOutputType.Results});
    },
  };
}

export function getErrorLogger() {}
