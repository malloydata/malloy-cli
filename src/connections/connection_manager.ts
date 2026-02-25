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
  BuildManifest,
  Connection,
  ConnectionConfigEntry,
  LookupConnection,
  MalloyConfig,
  getRegisteredConnectionTypes,
} from '@malloydata/malloy';
import {fileURLToPath} from 'url';
import path from 'path';

// Import db packages for their side-effect of registering connection types
import '@malloydata/db-bigquery';
import '@malloydata/db-duckdb';
import '@malloydata/db-postgres';
import '@malloydata/db-trino';
import '@malloydata/db-snowflake';

let malloyConfig: MalloyConfig;
let baseConnections: LookupConnection<Connection>;

/**
 * Wrap a LookupConnection with a fallback: if the connection name isn't in
 * the config but matches a registered connection type, create one with
 * default settings. This makes `duckdb.table(...)` work with no config.
 */
function withRegistryFallback(
  inner: LookupConnection<Connection>
): LookupConnection<Connection> {
  const registeredTypes = new Set(getRegisteredConnectionTypes());
  return {
    async lookupConnection(connectionName?: string): Promise<Connection> {
      try {
        return await inner.lookupConnection(connectionName);
      } catch (e) {
        // If the name matches a registered type, create with defaults
        if (connectionName && registeredTypes.has(connectionName)) {
          const fallbackConfig = new MalloyConfig(
            JSON.stringify({
              connections: {[connectionName]: {is: connectionName}},
            })
          );
          return fallbackConfig.connections.lookupConnection(connectionName);
        }
        throw e;
      }
    },
  };
}

export function loadConnections(config: MalloyConfig): void {
  malloyConfig = config;
  baseConnections = withRegistryFallback(config.connections);
}

export function getBuildManifest(): BuildManifest {
  return malloyConfig.manifest.buildManifest;
}

export function getConnectionLookup(
  fileURL?: URL
): LookupConnection<Connection> {
  if (!fileURL) return baseConnections;

  const map = malloyConfig.connectionMap;
  if (!map) return baseConnections;

  // If any connection supports workingDirectory but doesn't have one set,
  // inject the model file's directory so relative paths (like
  // duckdb.table('data.csv')) resolve next to the .malloy file.
  let needsOverride = false;
  for (const entry of Object.values(map)) {
    if (entry.workingDirectory === undefined) {
      needsOverride = true;
      break;
    }
  }

  if (!needsOverride) return baseConnections;

  let workingDir: string;
  try {
    workingDir = path.dirname(fileURLToPath(fileURL));
  } catch {
    return baseConnections;
  }

  // Create a temporary MalloyConfig with patched entries
  const patched: Record<string, ConnectionConfigEntry> = {};
  for (const [name, entry] of Object.entries(map)) {
    patched[name] =
      entry.workingDirectory === undefined
        ? {...entry, workingDirectory: workingDir}
        : entry;
  }
  const tempConfig = new MalloyConfig(JSON.stringify({connections: patched}));
  return withRegistryFallback(tempConfig.connections);
}
