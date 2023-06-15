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

/* eslint-disable no-console */
import {build, BuildOptions} from 'esbuild';
import * as path from 'path';
import fs from 'fs';
import {generateDisclaimer} from './license_disclaimer';

export const buildDirectory = 'dist/';

export const commonCLIConfig = (development = false): BuildOptions => {
  return {
    entryPoints: ['./src/index.ts'],
    outfile: path.join(buildDirectory, 'cli.js'),
    minify: !development,
    sourcemap: development,
    bundle: true,
    platform: 'node',
    define: {
      'process.env.NODE_DEBUG': 'false', // TODO this is a hack because some package we include assumed process.env exists :(
    },
  };
};

const errorHandler = (e: unknown) => {
  console.log(e);
  throw e;
};

const generateLicenseFile = (development: boolean) => {
  const fullLicenseFilePath = path.join(
    __dirname,
    '..',
    buildDirectory,
    'third_party_notices.txt'
  );

  if (fs.existsSync(fullLicenseFilePath)) {
    fs.rmSync(fullLicenseFilePath);
  }
  if (!development) {
    generateDisclaimer(
      path.join(__dirname, '..', 'package.json'),
      path.join(__dirname, '..', 'node_modules'),
      fullLicenseFilePath
    );
  } else {
    fs.writeFileSync(fullLicenseFilePath, 'LICENSES GO HERE\n');
  }
};

export async function doBuild(target?: string): Promise<void> {
  const development = target === undefined;

  fs.rmSync(buildDirectory, {recursive: true, force: true});
  fs.mkdirSync(buildDirectory, {recursive: true});

  generateLicenseFile(development);

  await build(commonCLIConfig(development)).catch(errorHandler);
}

const args = process.argv.slice(1);
if (args[0].endsWith('build')) {
  const target = args[1];
  doBuild(target);
}
