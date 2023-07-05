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
  Connection,
  LookupConnection,
  TestableConnection,
} from '@malloydata/malloy';
import {
  BigQueryConnectionConfig,
  ConfigOptions,
  ConnectionBackend,
  ConnectionConfig,
  DuckDBConnectionConfig,
  PostgresConnectionConfig,
} from './connection_types';
import {fileURLToPath} from 'url';
import {BigQueryConnection} from '@malloydata/db-bigquery';
import {convertToBytes, exitWithError} from '../util';
import {DuckDBConnection} from '@malloydata/db-duckdb';
import {PostgresConnection} from '@malloydata/db-postgres';
import {config} from '../config';

const DEFAULT_CONFIG = Symbol('default-config');

const createBigQueryConnection = async (
  connectionConfig: BigQueryConnectionConfig,
  {rowLimit}: ConfigOptions
): Promise<BigQueryConnection> => {
  const connection = new BigQueryConnection(
    connectionConfig.name,
    () => ({rowLimit}),
    {
      defaultProject: connectionConfig.projectName,
      serviceAccountKeyPath: connectionConfig.serviceAccountKeyPath,
      location: connectionConfig.location,
      maximumBytesBilled: convertToBytes(
        connectionConfig.maximumBytesBilled || ''
      ),
      timeoutMs: connectionConfig.timeoutMs,
    }
  );
  return connection;
};

const createDuckDbConnection = async (
  connectionConfig: DuckDBConnectionConfig,
  {workingDirectory, rowLimit}: ConfigOptions
) => {
  try {
    const connection = new DuckDBConnection(
      connectionConfig.name,
      ':memory:',
      connectionConfig.workingDirectory || workingDirectory,
      () => ({rowLimit})
    );
    return connection;
  } catch (error) {
    exitWithError(`Could not create DuckDB connection: ${error.message}`);
  }
};

const createPostgresConnection = async (
  connectionConfig: PostgresConnectionConfig,
  {rowLimit}: ConfigOptions
): Promise<PostgresConnection> => {
  const configReader = async () => {
    let password: string;
    if (connectionConfig.password !== undefined) {
      password = connectionConfig.password;
    } /* TODO else if (connectionConfig.useKeychainPassword) {
      password =
        (await getPassword(
          'com.malloy-lang.vscode-extension',
          `connections.${connectionConfig.id}.password`
        )) || undefined;
    }*/
    return {
      username: connectionConfig.username,
      host: connectionConfig.host,
      password,
      port: connectionConfig.port,
      databaseName: connectionConfig.databaseName,
    };
  };
  const connection = new PostgresConnection(
    connectionConfig.name,
    () => ({rowLimit}),
    configReader
  );
  return connection;
};

export class CLIConnectionFactory {
  connectionCache: Record<string, TestableConnection> = {};

  reset() {
    Object.values(this.connectionCache).forEach(connection =>
      connection.close()
    );
    this.connectionCache = {};
  }

  async getConnectionForConfig(
    connectionConfig: ConnectionConfig,
    configOptions: ConfigOptions = {
      workingDirectory: '/',
    }
  ): Promise<TestableConnection> {
    let connection: TestableConnection;

    switch (connectionConfig.backend) {
      case ConnectionBackend.BigQuery:
        connection = await createBigQueryConnection(
          connectionConfig,
          configOptions
        );
        break;
      case ConnectionBackend.Postgres: {
        connection = await createPostgresConnection(
          connectionConfig,
          configOptions
        );
        break;
      }
      case ConnectionBackend.DuckDB: {
        connection = await createDuckDbConnection(
          connectionConfig,
          configOptions
        );
        break;
      }
    }

    return connection;
  }

  getWorkingDirectory(url: URL): string {
    try {
      const baseUrl = new URL('.', url);
      const fileUrl = new URL(baseUrl.pathname, 'file:');
      return fileURLToPath(fileUrl);
    } catch {
      return '.';
    }
  }

  addDefaults(configs: ConnectionConfig[]): ConnectionConfig[] {
    // Create a default bigquery connection if one isn't configured
    if (
      !configs.find(config => config.backend === ConnectionBackend.BigQuery)
    ) {
      configs.push({
        name: 'bigquery',
        backend: ConnectionBackend.BigQuery,
        isDefault: !configs.find(config => config.isDefault),
        isGenerated: true,
      });
    }

    // Create a default duckdb connection if one isn't configured
    if (!configs.find(config => config.name === 'duckdb')) {
      configs.push({
        name: 'duckdb',
        backend: ConnectionBackend.DuckDB,
        isDefault: false,
        isGenerated: true,
      });
    }
    return configs;
  }
}

export class DynamicConnectionLookup implements LookupConnection<Connection> {
  connections: Record<string | symbol, Promise<Connection>> = {};

  constructor(
    private connectionFactory: CLIConnectionFactory,
    private configs: Record<string | symbol, ConnectionConfig>,
    private options: ConfigOptions
  ) {}

  async lookupConnection(
    connectionName?: string | undefined
  ): Promise<Connection> {
    const connectionKey = connectionName || DEFAULT_CONFIG;
    if (!this.connections[connectionKey]) {
      const connectionConfig = this.configs[connectionKey];
      if (connectionConfig) {
        this.connections[connectionKey] =
          this.connectionFactory.getConnectionForConfig(connectionConfig, {
            ...this.options,
          });
      } else {
        throw new Error(`No connection found with name ${connectionName}`);
      }
    }
    return this.connections[connectionKey];
  }

  addDefaults(configs: ConnectionConfig[]): ConnectionConfig[] {
    // Create a default bigquery connection if one isn't configured
    // TODO do we want to do this?
    if (
      !configs.find(config => config.backend === ConnectionBackend.BigQuery)
    ) {
      configs.push({
        name: 'bigquery',
        backend: ConnectionBackend.BigQuery,
        isDefault: !configs.find(config => config.isDefault),
        isGenerated: true,
      });
    }

    // Create a default duckdb connection if one isn't named duckdb
    if (!configs.find(config => config.backend === 'duckdb')) {
      configs.push({
        name: 'duckdb',
        backend: ConnectionBackend.DuckDB,
        isDefault: false,
        isGenerated: true,
      });
    }
    return configs;
  }
}

export class ConnectionManager {
  private connectionLookups: Record<string, DynamicConnectionLookup> = {};
  configMap: Record<string | symbol, ConnectionConfig> = {};
  connectionCache: Record<string | symbol, TestableConnection> = {};
  currentRowLimit = 50;

  constructor(
    private connectionFactory: CLIConnectionFactory,
    private configList: ConnectionConfig[]
  ) {
    this.buildConfigMap();
  }

  public setConnectionsConfig(connectionsConfig: ConnectionConfig[]): void {
    // Force existing connections to be regenerated
    this.configList = connectionsConfig;
    this.buildConfigMap();
    this.connectionFactory.reset();
  }

  public async connectionForConfig(
    connectionConfig: ConnectionConfig
  ): Promise<TestableConnection> {
    return this.connectionFactory.getConnectionForConfig(connectionConfig, {
      workingDirectory: '/',
    });
  }

  public getConnectionLookup(fileURL: URL): LookupConnection<Connection> {
    const workingDirectory =
      this.connectionFactory.getWorkingDirectory(fileURL);

    if (!this.connectionLookups[workingDirectory]) {
      this.connectionLookups[workingDirectory] = new DynamicConnectionLookup(
        this.connectionFactory,
        this.configMap,
        {
          workingDirectory,
          rowLimit: this.getCurrentRowLimit(),
        }
      );
    }
    return this.connectionLookups[workingDirectory];
  }

  public setCurrentRowLimit(rowLimit: number): void {
    this.currentRowLimit = rowLimit;
  }

  public getCurrentRowLimit(): number | undefined {
    return this.currentRowLimit;
  }

  public getAllConnectionConfigs() {
    return this.configList;
  }

  private buildConfigMap(): void {
    this.connectionLookups = {};
    this.connectionCache = {};

    const configs = this.connectionFactory.addDefaults(this.configList);
    configs.forEach(config => {
      if (config.isDefault) {
        this.configMap[DEFAULT_CONFIG] = config;
      }
      this.configMap[config.name] = config;
    });
  }
}

let connectionManager: ConnectionManager;
export function loadConnections(): void {
  connectionManager = new ConnectionManager(
    new CLIConnectionFactory(),
    config.connections
  );
}
export {connectionManager};
