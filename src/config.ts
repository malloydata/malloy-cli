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
  loadFile,
  exitWithError,
  isWindows,
  createDirectoryOrError,
  fileExists,
} from './util';
import {logger} from './log';
import {ConnectionConfig} from './connections/connection_types';

export interface Config {
  connections: ConnectionConfig[];
}

function getDefaultOSConfigFolderPath(): string {
  let location;

  // TODO look more at XDG spec
  // TODO $XDG_CONFIG_DIRS
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

let config: Config;
let configFilePath;
export function loadConfig(filePath?: string) {
  if (filePath) {
    if (process.env['MALLOY_CLI_CONFIG']) {
      logger.debug(
        `Loading config from MALLOY_CLI_CONFIG env variable (${process.env['MALLOY_CLI_CONFIG']})`
      );
    } else {
      logger.debug(`Loading config from passed path ${filePath}`);
    }

    configFilePath = filePath;
    const configText = loadFile(filePath);

    try {
      config = JSON.parse(configText) as Config; // TODO json type
      if (!config.connections) config.connections = [];
      logger.debug(`Configuration loaded from ${filePath}`);
    } catch (e) {
      exitWithError(`Error parsing config file at ${filePath}: ${e.message}`);
    }
  } else {
    // if config file is not passed, look in default location
    // note: there may not be a config yet, that's ok!
    const folder = getDefaultOSConfigFolderPath();
    logger.debug(`Loading config from default location: ${folder}`);
    configFilePath = path.join(folder, 'malloy', 'config.json');

    if (fileExists(configFilePath)) {
      const configText = loadFile(configFilePath);
      try {
        config = JSON.parse(configText) as Config; // TODO json type
        if (!config.connections) config.connections = [];
        logger.debug(`Configuration loaded from ${configFilePath}`);
      } catch (e) {
        exitWithError(
          `Error parsing config file at ${configFilePath}: ${e.message}`
        );
      }
    } else {
      logger.debug(
        'No config file passed and non found in default location, creating new config'
      );
      config = {
        connections: [],
      };
      saveConfig();
    }
  }
}
export {config};

export function saveConfig(): void {
  createDirectoryOrError(
    path.dirname(configFilePath),
    `Attempt to create default configuation folder at ${configFilePath} failed`
  );

  try {
    fs.writeFileSync(configFilePath, JSON.stringify(config));
  } catch (e) {
    exitWithError(
      `Could not write configuration information to ${configFilePath}: ${e.message}`
    );
  }
}
