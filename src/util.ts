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
import {cli} from './cli';

// when in pkg, need to look at where we are executing, __dirname etc are overridden
const directory = process.cwd();

export function exitWithError(message: string): never {
  return cli.error(message);
}

export function isWindows() {
  const sys = os.platform();
  return sys && sys.length >= 3
    ? sys.substring(0, 3).toLowerCase() === 'win'
      ? true
      : false
    : false;
}

export function createDirectoryOrError(path: string, message?: string): void {
  if (!fs.existsSync(path)) {
    try {
      fs.mkdirSync(path, {recursive: true});
    } catch (e) {
      exitWithError(
        message
          ? `${message}\n${errorMessage(e)}`
          : `Failed to create directory at ${path}`
      );
    }
  }
}

function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

export function loadFile(filePath: string): string {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(directory, filePath);

  logger.debug(`Checking for existence of ${absolutePath}`);
  if (!fileExists(absolutePath)) {
    exitWithError(`Unable to locate file: ${absolutePath}`);
  }

  try {
    fs.accessSync(absolutePath, fs.constants.R_OK);
  } catch (e) {
    exitWithError(`Do not have read access to file: ${absolutePath}`);
  }

  try {
    return fs.readFileSync(absolutePath, 'utf8').toString();
  } catch (e) {
    exitWithError(errorMessage(e));
  }
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : `${error}`;
}
