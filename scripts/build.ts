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
import {build, BuildOptions, Plugin} from 'esbuild';
import * as esbuild from 'esbuild';
import * as path from 'path';
import fs from 'fs';
import {generateDisclaimer} from './license_disclaimer';
import {getDuckDBExternals} from './utils/fetch-duckdb';

export const defaultBuildDirectory = 'dist/';
let buildDirectory = 'dist/';

export const commonCLIConfig = (development = false): BuildOptions => {
  return {
    minify: !development,
    sourcemap: development,
    bundle: true,
    platform: 'node',
    define: {
      'process.env.NODE_DEBUG': 'false', // TODO this is a hack because some package we include assumed process.env exists :(
    },
    // The @duckdb/node-bindings package dispatches to platform-specific
    // packages (e.g. @duckdb/node-bindings-darwin-arm64/duckdb.node).
    // Those are marked external so they're resolved at runtime.
    // The list is read from @duckdb/node-bindings/package.json so it
    // stays in sync automatically when duckdb updates.
    external: getDuckDBExternals(),
  };
};

const errorHandler = (e: unknown) => {
  console.log(e);
  throw e;
};

const generateLicenseFile = (development: boolean) => {
  const fullLicenseFilePath = path.join(
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

function wipeBuildDirectory(buildDirectory: string): void {
  fs.rmSync(buildDirectory, {recursive: true, force: true});
  fs.mkdirSync(buildDirectory, {recursive: true});
}

export async function doBuild(
  development = false,
  changeBuildDirectory?: string
): Promise<void> {
  if (changeBuildDirectory) buildDirectory = changeBuildDirectory;

  wipeBuildDirectory(buildDirectory);
  generateLicenseFile(development);

  const config = commonCLIConfig(development);
  config.entryPoints = ['./src/index.ts'];
  config.outfile = path.join(buildDirectory, 'cli.js');

  await build(config).catch(errorHandler);
}

export async function doWatch(development = false): Promise<void> {
  wipeBuildDirectory(buildDirectory);

  const watchRebuildLogPlugin: Plugin = {
    name: 'watchRebuildLogPlugin',
    setup(build) {
      build.onStart(() => {
        console.log('building');
      });
    },
  };

  const config = commonCLIConfig(development);
  config.plugins ??= [];
  config.plugins.push(watchRebuildLogPlugin);
  const ctx = await esbuild.context({
    ...config,
    entryPoints: ['./src/index.ts'],
    outfile: './dist/cli.js',
  });

  console.log('watching...');
  await ctx.watch();
}

const args = process.argv.slice(1);
if (args[1] && args[1].endsWith('watch')) {
  doWatch(true);
} else if (args[0].endsWith('build')) {
  doBuild(true);
}
