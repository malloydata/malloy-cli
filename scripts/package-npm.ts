/*
 * Copyright Contributors to the Malloy project
 * SPDX-License-Identifier: MIT
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
