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

import path from 'path';
import fs from 'fs';
import url from 'url';
import {
  MalloyConfig,
  URLReader,
  contextOverlay,
  discoverConfig,
} from '@malloydata/malloy';
import {
  exitWithError,
  isWindows,
  createDirectoryOrError,
  errorMessage,
} from './util';
import {logger} from './log';

export const urlReader: URLReader = {
  readURL: async (u: URL) => fs.readFileSync(url.fileURLToPath(u), 'utf8'),
};

function getDefaultOSConfigFolderPath(): string {
  let location;

  if (process.env['XDG_CONFIG_HOME']) {
    location = process.env['XDG_CONFIG_HOME'];
  } else if (isWindows()) {
    location = process.env['APPDATA'];
  } else {
    const home = process.env['HOME'];
    if (home) {
      location = path.join(home, '.config');
    }
  }

  if (!location)
    exitWithError(
      'Could not find a default place for configuration to be stored'
    );

  return location;
}

interface OldConnectionConfig {
  name: string;
  backend: string;
  isDefault?: boolean;
  [key: string]: string | number | boolean | undefined;
}

interface OldConfig {
  connections: OldConnectionConfig[];
}

function migrateOldConfig(oldConfigPath: string, newConfigPath: string): void {
  logger.debug(
    `Migrating old config from ${oldConfigPath} to ${newConfigPath}`
  );
  try {
    const oldText = fs.readFileSync(oldConfigPath, 'utf8');
    const oldConfig = JSON.parse(oldText) as OldConfig;
    const connections: Record<
      string,
      {is: string; [key: string]: string | number | boolean | undefined}
    > = {};

    if (Array.isArray(oldConfig.connections)) {
      for (const conn of oldConfig.connections) {
        const {name, backend, isDefault: _isDefault, ...rest} = conn;
        connections[name] = {is: backend, ...rest};
      }
    }

    fs.writeFileSync(newConfigPath, JSON.stringify({connections}, null, 2));
    fs.unlinkSync(oldConfigPath);
    logger.debug('Migration complete');
  } catch (e) {
    exitWithError(
      `Error migrating old config from ${oldConfigPath}: ${errorMessage(e)}`
    );
  }
}

// The resolved config for Runtime — immutable after construction.
let malloyConfig: MalloyConfig = new MalloyConfig({
  includeDefaultConnections: true,
});

// The path to the config file on disk — needed for connections commands
// and manifest path computation. undefined when no config file exists.
let configFilePath: string | undefined;

/**
 * Resolve an explicit --config path to a config file path.
 * Accepts either a direct file path or a directory containing malloy-config.json.
 */
function resolveConfigPath(configPath: string): string {
  const resolved = path.resolve(configPath);
  try {
    if (fs.statSync(resolved).isDirectory()) {
      return path.join(resolved, 'malloy-config.json');
    }
  } catch {
    exitWithError(`Config path not found: ${configPath}`);
  }
  return resolved;
}

/**
 * Read a config file and build a MalloyConfig from the POJO.
 * Sets configURL in the overlay so manifestURL resolves correctly.
 * Does NOT set rootDirectory — --config means "use this file", not
 * "this is my project root". DuckDB falls back to cwd.
 *
 * Forces includeDefaultConnections: true so that all registered backends
 * are available even if the config file only lists some connections.
 * This preserves CLI backwards compatibility — duckdb.table(...) works
 * with a config that only mentions postgres.
 */
function loadConfigFromFile(filePath: string): MalloyConfig {
  const text = fs.readFileSync(filePath, 'utf8');
  let pojo: Record<string, unknown>;
  try {
    pojo = JSON.parse(text);
  } catch (e) {
    exitWithError(
      `Error parsing config file at ${filePath}: ${errorMessage(e)}`
    );
  }
  pojo.includeDefaultConnections = true;
  const configURL = url.pathToFileURL(filePath).toString();
  return new MalloyConfig(pojo, {
    config: contextOverlay({configURL}),
  });
}

export async function loadConfig(
  explicitConfigPath?: string,
  projectDir?: string
): Promise<void> {
  // --projectDir mode: use core's discovery helper
  if (projectDir) {
    const resolvedProjectDir = path.resolve(projectDir);
    const cwd = process.cwd();

    // Validate cwd is at or below the project directory
    if (
      !cwd.startsWith(resolvedProjectDir + path.sep) &&
      cwd !== resolvedProjectDir
    ) {
      exitWithError(
        'Current directory is not inside project directory: ' +
          resolvedProjectDir
      );
    }

    const cwdURL = url.pathToFileURL(cwd + path.sep);
    const ceilingURL = url.pathToFileURL(resolvedProjectDir + path.sep);

    logger.debug(
      `Discovering config: cwd=${cwdURL.toString()}, ceiling=${ceilingURL.toString()}`
    );

    const discovered = await discoverConfig(cwdURL, ceilingURL, urlReader);

    if (discovered) {
      malloyConfig = discovered;
      // Extract configFilePath from the overlay for connections commands
      const discoveredURL = discovered.readOverlay('config', 'configURL');
      if (typeof discoveredURL === 'string') {
        configFilePath = url.fileURLToPath(discoveredURL);
      }
      logger.debug(`Configuration discovered at ${configFilePath}`);
      logConfigMessages(configFilePath ?? 'discovered config');
    } else {
      // No config found — soloist experience with defaults.
      // Set configFilePath to the project root so connections create
      // can bootstrap a malloy-config.json there.
      configFilePath = path.join(resolvedProjectDir, 'malloy-config.json');
      logger.debug('No config file found in project directory, using defaults');
      malloyConfig = new MalloyConfig(
        {includeDefaultConnections: true},
        {
          config: contextOverlay({
            rootDirectory: ceilingURL.toString(),
            configURL: url.pathToFileURL(configFilePath).toString(),
          }),
        }
      );
    }
    return;
  }

  // --config mode: read that specific file, no discovery
  if (explicitConfigPath) {
    configFilePath = resolveConfigPath(explicitConfigPath);
    logger.debug(`Loading config from --config: ${configFilePath}`);

    if (!fs.existsSync(configFilePath)) {
      exitWithError(`Config file not found: ${configFilePath}`);
    }

    try {
      malloyConfig = loadConfigFromFile(configFilePath);
      logger.debug(`Configuration loaded from ${configFilePath}`);
      logConfigMessages(configFilePath);
    } catch (e) {
      exitWithError(
        `Error parsing config file at ${configFilePath}: ${errorMessage(e)}`
      );
    }
    return;
  }

  // Default mode: global config at ~/.config/malloy/malloy-config.json
  const folder = getDefaultOSConfigFolderPath();
  const malloyDir = path.join(folder, 'malloy');
  configFilePath = path.join(malloyDir, 'malloy-config.json');
  const oldConfigPath = path.join(malloyDir, 'config.json');

  logger.debug(`Loading config from default location: ${malloyDir}`);

  // Auto-migrate old format
  if (!fs.existsSync(configFilePath) && fs.existsSync(oldConfigPath)) {
    createDirectoryOrError(
      malloyDir,
      `Attempt to create default configuration folder at ${malloyDir} failed`
    );
    migrateOldConfig(oldConfigPath, configFilePath);
  }

  if (fs.existsSync(configFilePath)) {
    try {
      malloyConfig = loadConfigFromFile(configFilePath);
      logger.debug(`Configuration loaded from ${configFilePath}`);
      logConfigMessages(configFilePath);
    } catch (e) {
      exitWithError(
        `Error parsing config file at ${configFilePath}: ${errorMessage(e)}`
      );
    }
  } else {
    logger.debug(
      'No config file found in default location, using empty config'
    );
    malloyConfig = new MalloyConfig({includeDefaultConnections: true});
    configFilePath = path.join(malloyDir, 'malloy-config.json');
  }
}

export {malloyConfig};

function logConfigMessages(filePath: string): void {
  for (const msg of malloyConfig.log) {
    if (msg.severity === 'error') {
      logger.error(`${filePath}: ${msg.message}`);
    } else if (msg.severity === 'warn') {
      logger.warn(`${filePath}: ${msg.message}`);
    }
  }
}

/**
 * Read the raw config POJO from the config file on disk.
 * Returns the unresolved JSON — overlay references like {env: "..."} are
 * preserved as-is. Returns undefined if no config file exists.
 */
export function readConfigPojo(): Record<string, unknown> | undefined {
  if (!configFilePath || !fs.existsSync(configFilePath)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(configFilePath, 'utf8'));
  } catch {
    return undefined;
  }
}

/**
 * Save an updated connections map back to the config file.
 * Re-reads the file to preserve all non-connections fields, then splices
 * in the new connections and writes it back.
 */
export function saveConfig(connections: Record<string, unknown>): void {
  if (!configFilePath) {
    exitWithError('No config file path — cannot save');
  }

  createDirectoryOrError(
    path.dirname(configFilePath),
    `Attempt to create default configuration folder at ${configFilePath} failed`
  );

  let raw: Record<string, unknown> = {};
  if (fs.existsSync(configFilePath)) {
    try {
      raw = JSON.parse(fs.readFileSync(configFilePath, 'utf8'));
    } catch {
      logger.warn(
        `Could not parse ${configFilePath}, non-connections fields will be lost`
      );
    }
  }
  raw.connections = connections;
  fs.writeFileSync(configFilePath, JSON.stringify(raw, null, 2));
}
