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

import {
  createLogger as createWinstonLogger,
  transports,
  format,
  Logger,
} from 'winston';

let logger: Logger;
let silent = false;
export {silent};

// CLI output is independent of logger
const cliOutputLogger: Logger = createWinstonLogger({
  level: 'info',
  transports: [new transports.Console()],
  format: format.combine(
    format.colorize(),
    format.printf(({message}) => {
      return `${message}`;
    })
  ),
});

export function silenceOut(): void {
  cliOutputLogger.silent = true;
  silent = true;
}

export function out(message: string): void {
  cliOutputLogger.info(message);
  //logger.info(message);
}

export function createBasicLogger(level = 'warning'): void {
  logger = createWinstonLogger({
    level,
    transports: [new transports.Console()],
    format: format.combine(
      format.colorize(),
      format.timestamp(),
      format.printf(({level, message}) => {
        return `${level}: ${message}`;
      })
    ),
    defaultMeta: {
      service: 'MalloyCLI',
    },
  });
}

export {logger};
