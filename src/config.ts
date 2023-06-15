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
import {loadFile, exitWithError, isWindows} from './util';
import {logger} from './log';

interface Config {
  connections: [];
}

function getDefaultConfigFolderPath(): string {
  let location;

  // TODO look more at XDG spec
  if (isWindows()) {
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

function getDefaultConfigPathOrError(): string {
  const folder = getDefaultConfigFolderPath();

  const configPath = path.join(folder, 'malloy', 'config.json');
  if (!fs.existsSync(configPath)) {
    exitWithError(
      `Could not find default configuration file at ${configPath} and no file passed
via arguments or env variable. Try running "malloy connections create" to create a connection and save into config`
    );
  } else {
    return configPath;
  }
}

let config: Config;
export function loadConfig(filePath?: string) {
  if (filePath) {
    logger.debug(`Loading config from passed path ${filePath}`);
  } else if (process.env['MALLOY_CLI_CONFIG']) {
    logger.debug(
      `Loading config from MALLOY_CLI_CONFIG env variable (${process.env['MALLOY_CLI_CONFIG']})`
    );
    filePath = process.env['MALLOY_CLI_CONFIG'];
  } else {
    filePath = getDefaultConfigPathOrError();
  }

  const configText = loadFile(filePath);

  try {
    config = JSON.parse(configText) as Config; // TODO json type
  } catch (e) {
    exitWithError(`Could not parse config file at ${filePath}: ${e.message}`);
  }
}
export {config};

export function saveConfig(config: JSON): void {
  const configFolderPath = getDefaultConfigFolderPath();
}
