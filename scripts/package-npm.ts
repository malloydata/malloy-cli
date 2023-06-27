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
import {defaultBuildDirctory, doBuild, doPostInstallBuild} from './build';
import {readPackageJson} from './utils/licenses';

const args = process.argv.slice(1);

// passing "test" as 1st argument builds a test build for e2e tests
const buildDirectory =
  args[1] && args[1] === 'test'
    ? path.join(__dirname, '..', 'test', '.build', 'npmBin')
    : defaultBuildDirctory;

// this is run before publishing to NPM - places
// built file in dist/, and also a post-install script
// into dist that will run to fetch appropriate duckdb.node
// for the platform/arch being installed into
doBuild(false, buildDirectory);
doPostInstallBuild();

const version = readPackageJson(
  path.join(__dirname, '..', 'package.json')
).version;

fs.writeFileSync(
  path.join(buildDirectory, 'index.js'),
  `#!/usr/bin/env node\nprocess.MALLOY_CLI_VERSION="${version}";\nrequire('./cli.js')`
);
