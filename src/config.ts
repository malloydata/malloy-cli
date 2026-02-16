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
import {
  ConnectionsConfig,
  readConnectionsConfig,
  writeConnectionsConfig,
} from '@malloydata/malloy';
import {
  exitWithError,
  isWindows,
  createDirectoryOrError,
  errorMessage,
} from './util';
import {logger} from './log';

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
    const connections: ConnectionsConfig['connections'] = {};

    if (Array.isArray(oldConfig.connections)) {
      for (const conn of oldConfig.connections) {
        const {name, backend, isDefault: _isDefault, ...rest} = conn;
        connections[name] = {is: backend, ...rest};
      }
    }

    const newConfig: ConnectionsConfig = {connections};
    fs.writeFileSync(newConfigPath, writeConnectionsConfig(newConfig));
    fs.unlinkSync(oldConfigPath);
    logger.debug('Migration complete');
  } catch (e) {
    exitWithError(
      `Error migrating old config from ${oldConfigPath}: ${errorMessage(e)}`
    );
  }
}

let config: ConnectionsConfig = {connections: {}};
let configFilePath: string;

export function loadConfig(): void {
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
      const configText = fs.readFileSync(configFilePath, 'utf8');
      config = readConnectionsConfig(configText);
      logger.debug(`Configuration loaded from ${configFilePath}`);
    } catch (e) {
      exitWithError(
        `Error parsing config file at ${configFilePath}: ${errorMessage(e)}`
      );
    }
  } else {
    logger.debug(
      'No config file found in default location, using empty config'
    );
    config = {connections: {}};
  }
}

export {config};

export function saveConfig(): void {
  createDirectoryOrError(
    path.dirname(configFilePath),
    `Attempt to create default configuration folder at ${configFilePath} failed`
  );

  try {
    fs.writeFileSync(configFilePath, writeConnectionsConfig(config));
  } catch (e) {
    exitWithError(
      `Could not write configuration information to ${configFilePath}: ${errorMessage(
        e
      )}`
    );
  }
}
