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
import os from 'os';
import {logger} from './log';

// when in pkg, need to look at where we are executing, __dirname etc are overridden
const directory = path.dirname(process.execPath);

export function exitWithError(message: string): void {
  logger.error(message);
  process.exit(1);
}

export function isWindows() {
  const sys = os.platform();
  return sys && sys.length >= 3
    ? sys.substring(0, 3).toLowerCase() === 'win'
      ? true
      : false
    : false;
}

export function loadFile(filePath): string {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(directory, filePath);

  logger.debug(
    `attempting to load ${filePath} at absolute path: ${absolutePath}`
  );

  if (!fs.existsSync(absolutePath)) {
    exitWithError(`Unable to locate file: ${absolutePath}`);
  }

  try {
    fs.accessSync(absolutePath, fs.constants.R_OK);
  } catch (e) {
    exitWithError(`Do not have read access to file: ${absolutePath}`);
  }

  try {
    return fs.readFileSync(absolutePath).toString();
  } catch (e) {
    exitWithError(e.message);
  }
}
