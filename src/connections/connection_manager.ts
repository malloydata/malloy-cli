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
  ConnectionsConfig,
  LookupConnection,
  createConnectionsFromConfig,
} from '@malloydata/malloy';
import {fileURLToPath} from 'url';
import path from 'path';

// Import db packages for their side-effect of registering connection types
import '@malloydata/db-bigquery';
import '@malloydata/db-duckdb';
import '@malloydata/db-postgres';
import '@malloydata/db-trino';
import '@malloydata/db-snowflake';

let baseConfig: ConnectionsConfig = {connections: {}};
let connectionLookup: LookupConnection<Connection>;

export function loadConnections(config: ConnectionsConfig): void {
  baseConfig = config;
  connectionLookup = createConnectionsFromConfig(config);
}

export function getConnectionLookup(
  fileURL?: URL
): LookupConnection<Connection> {
  if (!fileURL) return connectionLookup;

  // If any connection supports workingDirectory but doesn't have one set,
  // inject the model file's directory so relative paths (like
  // duckdb.table('data.csv')) resolve next to the .malloy file.
  let workingDir: string | undefined;
  let needsOverride = false;
  for (const entry of Object.values(baseConfig.connections)) {
    if (entry.workingDirectory === undefined) {
      needsOverride = true;
      break;
    }
  }

  if (!needsOverride) return connectionLookup;

  try {
    workingDir = path.dirname(fileURLToPath(fileURL));
  } catch {
    return connectionLookup;
  }

  const patched: ConnectionsConfig = {connections: {}};
  for (const [name, entry] of Object.entries(baseConfig.connections)) {
    if (entry.workingDirectory === undefined) {
      patched.connections[name] = {...entry, workingDirectory: workingDir};
    } else {
      patched.connections[name] = entry;
    }
  }

  return createConnectionsFromConfig(patched);
}
