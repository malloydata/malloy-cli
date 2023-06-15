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

import {ConnectionConfig, config, saveConfig} from '../config';
import {connectionManager} from '../connections/connection_manager';
import {ConnectionBackend} from '../connections/connection_types';
import {cliOut, logger} from '../log';
import {exitWithError} from '../util';

function connectionConfigFromName(name: string): ConnectionConfig {
  return config.connections.find(connection => connection.name === name);
}

export function createBigQueryConnectionCommand(name: string): void {
  if (connectionConfigFromName(name))
    exitWithError(`A connection named ${name} already exists`);

  const connection: ConnectionConfig = {
    name,
    backend: ConnectionBackend.BigQuery,
  };

  config.connections.push(connection);
  saveConfig();
  logger.info(`Connection ${name} created`);
}

export async function testConnectionCommand(name: string): Promise<void> {
  const connectionConfig = connectionConfigFromName(name);
  if (!connectionConfig)
    exitWithError(`A connection named ${name} could not be found`);
  const connection = await connectionManager.connectionForConfig(
    connectionConfig
  );

  try {
    await connection.test();
    cliOut('Connection test successful');
  } catch (e) {
    exitWithError(`Connection test unsuccessful: ${e.message}`);
  }
}

export function listConnectionsCommand(): void {
  if (config.connections.length > 0) {
    config.connections.forEach(c => {
      cliOut(`${c.name}:\n\ttype: ${c.backend}`);
    });
  } else {
    cliOut('No connections found');
  }
}
