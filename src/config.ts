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

const couldNotFindDefaultConfigErrorMessage =
  'Could not find default configuration file and no config file passed via arguments of env variable. Try running "malloy connections create" to create a connection and save into config';

function findDefaultConfigPathOrError(): string {
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

  if (location) {
    location = path.join(location, 'malloy', 'config.json');
    if (!fs.existsSync(location)) {
      exitWithError(couldNotFindDefaultConfigErrorMessage);
    } else {
      return location;
    }
  } else {
    exitWithError(couldNotFindDefaultConfigErrorMessage);
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
    filePath = findDefaultConfigPathOrError();
  }

  const configText = loadFile(filePath);

  try {
    config = JSON.parse(configText) as Config; // TODO json type
  } catch (e) {
    exitWithError(`Could not parse config file at ${filePath}: ${e.message}`);
  }
}
export {config};

export function saveConfig(config: JSON): void {}
