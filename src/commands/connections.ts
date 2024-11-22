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

import {config, saveConfig} from '../config';
import {connectionManager} from '../connections/connection_manager';
import {
  BigQueryConnectionOptions,
  ConnectionBackend,
  ConnectionConfig,
  PostgresConnectionOptions,
} from '../connections/connection_types';
import {out} from '../log';
import {errorMessage, exitWithError} from '../util';

function connectionConfigFromName(name: string): ConnectionConfig | undefined {
  return config.connections.find(connection => connection.name === name);
}

export function createBigQueryConnectionCommand(
  name: string,
  options: BigQueryConnectionOptions
): void {
  if (connectionConfigFromName(name))
    exitWithError(`A connection named ${name} already exists`);

  const connection: ConnectionConfig = {
    name,
    backend: ConnectionBackend.BigQuery,
    isGenerated: false,
    isDefault: false,
  };

  if (options.project) connection.projectName = options.project;
  if (options.location) connection.location = options.location;
  if (options.maximumBytesBilled)
    connection.maximumBytesBilled = `${options.maximumBytesBilled}`;
  if (options.serviceAccountKeyPath)
    connection.serviceAccountKeyPath = options.serviceAccountKeyPath;
  if (options.timeout) connection.timeoutMs = `${options.timeout}`;

  config.connections.push(connection);
  saveConfig();
  out(`Connection ${name} created`);
}

export function createPostgresConnectionCommand(
  name: string,
  options: PostgresConnectionOptions
): void {
  if (connectionConfigFromName(name))
    exitWithError(`A connection named ${name} already exists`);

  const connection: ConnectionConfig = {
    name,
    backend: ConnectionBackend.Postgres,
    isGenerated: false,
    isDefault: false,
  };

  if (options.database) connection.databaseName = options.database;
  if (options.port) connection.port = options.port;
  if (options.host) connection.host = options.host;
  if (options.username) connection.username = options.username;
  if (options.password) connection.password = options.password;

  config.connections.push(connection);
  saveConfig();
  out(`Connection ${name} created`);
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
    out('Connection test successful');
  } catch (e) {
    exitWithError(`Connection test unsuccessful: ${errorMessage(e)}`);
  }
}

export function showConnectionCommand(name: string): void {
  const connection = config.connections.find(c => c.name === name);
  if (!connection) exitWithError(`Could not find a connection named ${name}`);
  out(JSON.stringify(connection, null, 4));
}

export function listConnectionsCommand(): void {
  if (config.connections.length > 0) {
    config.connections.forEach(c => {
      out(`${c.name}:\n\ttype: ${c.backend}`);
    });
  } else {
    out('No connections found');
  }
}

export function removeConnectionCommand(name: string): void {
  const i = config.connections.findIndex(c => c.name === name);
  if (i >= 0) {
    config.connections.splice(i, 1);
    saveConfig();
    out(`${name} removed from connections`);
  } else {
    exitWithError(`Could not find a connection named ${name}`);
  }
}
