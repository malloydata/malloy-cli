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
import {defaultBuildDirectory, doBuild} from './build';
import {readPackageJson} from './utils/licenses';
import {getDuckDBNativePackages} from './utils/fetch-duckdb';

const args = process.argv.slice(1);

// passing "test" as 1st argument builds a test build for e2e tests
const buildDirectory =
  args[1] && args[1] === 'test'
    ? path.join(__dirname, '..', 'test', '.build', 'npmBin')
    : defaultBuildDirectory;

// Sync duckdb native binding packages into optionalDependencies,
// reading versions from @duckdb/node-bindings/package.json so they
// stay in sync automatically when duckdb is updated.
const pkgJsonPath = path.join(__dirname, '..', 'package.json');
const originalContent = fs.readFileSync(pkgJsonPath, 'utf-8');
const pkgJson = JSON.parse(originalContent);
pkgJson.optionalDependencies = {
  ...pkgJson.optionalDependencies,
  ...getDuckDBNativePackages(),
};
const updatedContent = JSON.stringify(pkgJson, null, 2) + '\n';
if (updatedContent !== originalContent) {
  fs.writeFileSync(pkgJsonPath, updatedContent);
}

// Build the CLI bundle into dist/ (or test build directory).
doBuild(false, buildDirectory);

const version = readPackageJson(
  path.join(__dirname, '..', 'package.json')
).version;

fs.writeFileSync(
  path.join(buildDirectory, 'index.js'),
  `#!/usr/bin/env node\nprocess.MALLOY_CLI_VERSION="${version}";\nrequire('./cli.js')`
);
