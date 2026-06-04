/*
 * Copyright Contributors to the Malloy project
 * SPDX-License-Identifier: MIT
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

/**
 * Route all log output to stderr. Needed when stdout is reserved for a
 * protocol stream (e.g. MCP's JSON-RPC over stdio).
 */
export function createStderrLogger(level = 'warning'): void {
  logger = createWinstonLogger({
    level,
    transports: [
      new transports.Console({
        stderrLevels: ['error', 'warn', 'info', 'verbose', 'debug', 'silly'],
      }),
    ],
    format: format.combine(
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
