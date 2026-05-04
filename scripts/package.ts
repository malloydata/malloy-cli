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
import {defaultBuildDirectory, doBuild} from './build';
import * as pkg from 'pkg';
import path from 'path';
import * as fs from 'fs';
import {execSync} from 'child_process';
import {Command} from '@commander-js/extra-typings';
import {
  getTargetDuckDBPackageMap,
  resolveDuckDBNative,
} from './utils/fetch-duckdb';

/**
 * Build metadata for binary builds: tells the user which commit a
 * locally-built binary corresponds to. Returns a semver build-metadata
 * suffix (`+<date>.<sha>[.dirty]`); leaves npm semver ordering alone
 * because build metadata is ignored for ordering. Returns '' if we can't
 * read git (e.g. building from a tarball outside a repo).
 */
function getBuildMetadataSuffix(): string {
  try {
    const sha = execSync('git rev-parse --short=7 HEAD', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
    const dirty = execSync('git status --porcelain', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim()
      ? '.dirty'
      : '';
    const now = new Date();
    const date = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(
      2,
      '0'
    )}.${String(now.getDate()).padStart(2, '0')}`;
    return `+${date}.${sha}${dirty}`;
  } catch {
    return '';
  }
}

const nodeTarget = 'node18';
const outputFolder = 'pkg/';

async function packageCLI(
  platform: string,
  architecture: string,
  sign = true,
  skipPackageStep = false,
  version = 'dev',
  filenameVersion = version
) {
  let target = `${platform}-${architecture}`;

  await doBuild(false);

  if (sign) {
    console.log('Signing not yet implemented');
  }

  const targetDuckDBPackageMap = getTargetDuckDBPackageMap();
  if (!targetDuckDBPackageMap[target]) {
    throw new Error(`No DuckDB native binding package for target: ${target}`);
  }

  // The native .node file comes from the @duckdb/node-bindings-* npm package.
  // For cross-platform packaging the target package must be installed.
  const nativePath = resolveDuckDBNative(target);
  const destPath = path.resolve(__dirname, '../dist/duckdb-native.node');
  fs.rmSync(destPath, {force: true});
  fs.copyFileSync(nativePath, destPath);

  if (platform === 'darwin') {
    target = `macos-${architecture}`;
  }

  if (skipPackageStep) {
    console.log('Skipping final packaging step');
    return;
  }

  fs.writeFileSync(
    path.join(defaultBuildDirectory, 'index.js'),
    `#!/usr/bin/env node\nprocess.MALLOY_CLI_VERSION="${version}";\nrequire('./cli.js')`
  );

  await pkg.exec([
    '-c',
    'package.json',
    'dist/index.js',
    '--target',
    `${nodeTarget}-${target}`,
    '--output',
    path.join(outputFolder, `/malloy-cli-${target}-${filenameVersion}`),
    '--compress',
    'gzip',
  ]);
}

/**
 * @returns Array of version bits. [major, minor, patch]
 */
function getVersionBits(): Array<number> {
  return JSON.parse(fs.readFileSync('package.json', 'utf-8'))
    .version.split('.')
    .map(Number);
}

type Architecture = 'x64' | 'arm64';
type Platform = 'darwin' | 'linux' | 'win32';

interface PackageTarget {
  architecture: Architecture;
  platform: Platform;
}

(async () => {
  const program = new Command()
    .option('-p, --platform <string>', 'Target platform')
    .option('-a, --arch <string>', 'Target architecture')
    .option('--skip-package', 'Skip packaging step')
    .option('--sign', 'Sign the build executable')
    .option(
      '--all-targets',
      'create all supported platform/binary combinations'
    );

  program.parse();
  const options = program.opts();
  let platform: string;
  let architecture: string;

  let targets: PackageTarget[];
  if (options.allTargets) {
    targets = [
      {platform: 'darwin', architecture: 'x64'},
      {platform: 'darwin', architecture: 'arm64'},
      {platform: 'linux', architecture: 'x64'},
      {platform: 'linux', architecture: 'arm64'},
      {platform: 'win32', architecture: 'x64'},
    ];
  } else {
    if (options.platform) {
      platform = options.platform;
    } else {
      platform = process.platform;
      console.log(
        `Target platform was not specified, using current: ${platform}`
      );
    }

    if (options.arch) {
      architecture = options.arch;
    } else {
      architecture = process.arch;
      console.log(
        `Target architecture was not specified, using current: ${architecture}`
      );
    }
    targets = [
      {
        platform: platform as Platform,
        architecture: architecture as Architecture,
      },
    ];
  }

  fs.rmSync(outputFolder, {recursive: true, force: true});
  fs.mkdirSync(outputFolder, {recursive: true});

  const versionBits = getVersionBits();
  const filenameVersion = versionBits.join('.');
  const version = filenameVersion + getBuildMetadataSuffix();

  for (const target of targets) {
    console.log(
      `Packaging Malloy CLI for ${target.platform}-${target.architecture}`
    );
    await packageCLI(
      target.platform,
      target.architecture,
      options.sign,
      options.skipPackage,
      version,
      filenameVersion
    );
  }
})()
  .then(() => {
    console.log('Malloy CLI built successfully');
  })
  .catch(error => {
    console.log(error);
    process.exit(1);
  });
