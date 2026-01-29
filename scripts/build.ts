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
    banner: {
  js: `#!/usr/bin/env node
// Polyfill for SlowBuffer (removed in Node.js 25+)
if (typeof Buffer !== 'undefined' && !Buffer.SlowBuffer) {
  Buffer.SlowBuffer = Buffer;
}
// Patch require('buffer') to return SlowBuffer
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
  const module = originalRequire.apply(this, arguments);
  if (id === 'buffer' && !module.SlowBuffer) {
    module.SlowBuffer = Buffer;
  }
  return module;
};`,
},
    plugins: [makeDuckdbNoNodePreGypPlugin(development)],
    external: ['duckdb/lib/binding/duckdb.node', './duckdb-native.node'],
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

function makeDuckdbNoNodePreGypPlugin(development = false): Plugin {
  // eslint-disable-next-line node/no-extraneous-require
  const localPath = require.resolve('duckdb/lib/binding/duckdb.node');
  return {
    name: 'duckdbNoNodePreGypPlugin',
    setup(build) {
      build.onResolve({filter: /duckdb-binding\.js/}, args => {
        return {
          path: args.path,
          namespace: 'duckdb-no-node-pre-gyp-plugin',
        };
      });
      build.onLoad(
        {
          filter: /duckdb-binding\.js/,
          namespace: 'duckdb-no-node-pre-gyp-plugin',
        },
        _args => {
          return {
            contents: `
              var path = require("path");
              var os = require("os");

              var binding_path = ${
                development
                  ? `"${localPath}"`
                  : 'require.resolve("./duckdb-native.node")'
              };

              // dlopen is used because we need to specify the RTLD_GLOBAL flag to be able to resolve duckdb symbols
              // on linux where RTLD_LOCAL is the default.
              process.dlopen(module, binding_path, os.constants.dlopen.RTLD_NOW | os.constants.dlopen.RTLD_GLOBAL);
            `,
            resolveDir: '.',
          };
        }
      );
    },
  };
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
  config.outfile = path.join(buildDirectory, 'index.js');

  await build(config).catch(errorHandler);
  fs.chmodSync(path.join(buildDirectory, 'index.js'), 0o755);


  // Build malloy-pub CLI
  const pubConfig = commonCLIConfig(development);
  pubConfig.entryPoints = ['./src/malloy-pub.ts'];
  pubConfig.outfile = path.join(buildDirectory, 'malloy-pub.js');
  await build(pubConfig).catch(errorHandler);

  fs.chmodSync(path.join(buildDirectory, 'malloy-pub.js'), 0o755);
}

export async function doPostInstallBuild(development = false): Promise<void> {
  const config = commonCLIConfig(development);
  config.entryPoints = ['./scripts/post-install.ts'];
  config.outfile = path.join(buildDirectory, 'post-install.js');
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