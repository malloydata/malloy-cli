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
import {MalloyConfig, URLReader} from '@malloydata/malloy';
import {
  exitWithError,
  isWindows,
  createDirectoryOrError,
  errorMessage,
} from './util';
import {logger} from './log';
import {validateConfig} from './config_validation';

const urlReader: URLReader = {
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

let malloyConfig = new MalloyConfig('{"connections":{}}');
let configFilePath: string;

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

export async function loadConfig(explicitPath?: string): Promise<void> {
  if (explicitPath) {
    configFilePath = resolveConfigPath(explicitPath);
    logger.debug(`Loading config from --config: ${configFilePath}`);

    if (!fs.existsSync(configFilePath)) {
      exitWithError(`Config file not found: ${configFilePath}`);
    }

    try {
      const configURL = url.pathToFileURL(configFilePath).toString();
      malloyConfig = new MalloyConfig(urlReader, configURL);
      await malloyConfig.load();
      logger.debug(`Configuration loaded from ${configFilePath}`);
      warnOnValidationErrors(configFilePath);
    } catch (e) {
      exitWithError(
        `Error parsing config file at ${configFilePath}: ${errorMessage(e)}`
      );
    }
    return;
  }

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
      const configURL = url.pathToFileURL(configFilePath).toString();
      malloyConfig = new MalloyConfig(urlReader, configURL);
      await malloyConfig.load();
      logger.debug(`Configuration loaded from ${configFilePath}`);
      warnOnValidationErrors(configFilePath);
    } catch (e) {
      exitWithError(
        `Error parsing config file at ${configFilePath}: ${errorMessage(e)}`
      );
    }
  } else {
    logger.debug(
      'No config file found in default location, using empty config'
    );
    malloyConfig = new MalloyConfig('{"connections":{}}');
  }
}

export {malloyConfig};

function warnOnValidationErrors(filePath: string): void {
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return;
  }
  for (const w of validateConfig(raw)) {
    logger.warn(`${filePath}: ${w.path}: ${w.message}`);
  }
}

/**
 * Derive the manifest file path using the same convention as MalloyConfig:
 * <configDir>/<manifestPath>/malloy-manifest.json
 * where manifestPath defaults to "MANIFESTS".
 *
 * TODO: Replace this with a `manifestRoot` getter on MalloyConfig in core,
 * so the path convention lives in one place. MalloyConfig.load() already
 * computes `new URL(manifestPath, configURL)` — it just needs to store and
 * expose it. Then this function becomes:
 *   new URL('malloy-manifest.json', malloyConfig.manifestRoot)
 */
export function getManifestFilePath(): string {
  const manifestDir = malloyConfig.data?.manifestPath ?? 'MANIFESTS';
  return path.join(
    path.dirname(configFilePath),
    manifestDir,
    'malloy-manifest.json'
  );
}

export function saveConfig(): void {
  createDirectoryOrError(
    path.dirname(configFilePath),
    `Attempt to create default configuration folder at ${configFilePath} failed`
  );

  try {
    const saveData = {
      ...malloyConfig.data,
      connections: malloyConfig.connectionMap ?? {},
    };
    fs.writeFileSync(configFilePath, JSON.stringify(saveData, null, 2));
  } catch (e) {
    exitWithError(
      `Could not write configuration information to ${configFilePath}: ${errorMessage(
        e
      )}`
    );
  }
}
