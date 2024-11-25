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

import {ConnectionConfig as BaseConnectionConfig} from '@malloydata/malloy';

export enum ConnectionBackend {
  BigQuery = 'bigquery',
  Postgres = 'postgres',
  DuckDB = 'duckdb',
  Snowflake = 'snowflake',
  Presto = 'presto',
  Trino = 'trino',
}

export const ConnectionBackendNames: Record<ConnectionBackend, string> = {
  [ConnectionBackend.BigQuery]: 'BigQuery',
  [ConnectionBackend.Postgres]: 'Postgres',
  [ConnectionBackend.DuckDB]: 'DuckDB',
  [ConnectionBackend.Snowflake]: 'Snowflake',
  [ConnectionBackend.Presto]: 'Presto',
  [ConnectionBackend.Trino]: 'Trino',
};

export interface BigQueryConnectionOptions {
  project?: string;
  serviceAccountKeyPath?: string;
  projectName?: string;
  location?: string;
  maximumBytesBilled?: number;
  timeout?: number;
}

export interface BigQueryConnectionConfig extends BaseConnectionConfig {
  project?: string;
  backend: ConnectionBackend.BigQuery;
  serviceAccountKeyPath?: string;
  projectId?: string;
  /** @deprecated use projectId */
  projectName?: string;
  location?: string;
  maximumBytesBilled?: string;
  timeoutMs?: string;
}

export interface PostgresConnectionOptions {
  username?: string;
  password?: string;
  host?: string;
  port?: number;
  database?: string;
  useKeychainPassword?: boolean;
}

export interface PostgresConnectionConfig extends BaseConnectionConfig {
  backend: ConnectionBackend.Postgres;
  username?: string;
  password?: string;
  host?: string;
  port?: number;
  databaseName?: string;
  useKeychainPassword?: boolean;
}

export interface DuckDBConnectionOptions {
  workingDirectory?: string;
  databasePath?: string;
  motherDuckToken?: string;
}

export interface DuckDBConnectionConfig extends BaseConnectionConfig {
  backend: ConnectionBackend.DuckDB;
  workingDirectory?: string;
  databasePath?: string;
  motherDuckToken?: string;
}

export interface SnowflakeConnectionOptions {
  account: string;
  username?: string;
  password?: string;
  warehouse?: string;
  database?: string;
  schema?: string;
  timeoutMs?: number;
}

export interface SnowflakeConnectionConfig extends BaseConnectionConfig {
  backend: ConnectionBackend.Snowflake;
  account: string;
  username?: string;
  password?: string;
  warehouse?: string;
  database?: string;
  schema?: string;
  timeoutMs?: number;
}

export interface PrestoConnectionOptions {
  server?: string;
  port?: number;
  catalog?: string;
  schema?: string;
  user?: string;
  password?: string;
}

export interface PrestoConnectionConfig
  extends PrestoConnectionOptions,
    BaseConnectionConfig {
  backend: ConnectionBackend.Presto;
}

export interface TrinoConnectionOptions {
  server?: string;
  port?: number;
  catalog?: string;
  schema?: string;
  user?: string;
  password?: string;
}

export interface TrinoConnectionConfig
  extends TrinoConnectionOptions,
    BaseConnectionConfig {
  backend: ConnectionBackend.Trino;
}

export type ConnectionConfig =
  | BigQueryConnectionConfig
  | PostgresConnectionConfig
  | DuckDBConnectionConfig
  | SnowflakeConnectionConfig
  | PrestoConnectionConfig
  | TrinoConnectionConfig;

export interface ConfigOptions {
  workingDirectory: string;
  rowLimit?: number;
}
