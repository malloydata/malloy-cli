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

export const buildDirectory = 'dist/';

export const commonCLIConfig = (development = false, target?): BuildOptions => {
  return {
    entryPoints: ['./src/index.ts', './scripts/post-install.ts'],
    outdir: buildDirectory,
    minify: false,
    sourcemap: development,
    bundle: true,
    platform: 'node',
    define: {
      'process.env.NODE_DEBUG': 'false', // TODO this is a hack because some package we include assumed process.env exists :(
    },
    plugins: [makeDuckdbNoNodePreGypPlugin(target)],
    external: ['duckdb/lib/binding/duckdb.node'],
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

function makeDuckdbNoNodePreGypPlugin(target: string | undefined): Plugin {
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
                target
                  ? 'require.resolve("./duckdb-native.node")'
                  : `"${localPath}"`
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

export async function doBuild(target?: string, dev?: boolean): Promise<void> {
  //const development = process.env.NODE_ENV == "development";
  const development = dev || target === undefined;

  fs.rmSync(buildDirectory, {recursive: true, force: true});
  fs.mkdirSync(buildDirectory, {recursive: true});

  generateLicenseFile(development);

  await build(commonCLIConfig(development, target)).catch(errorHandler);
}

export async function doWatch(target?: string, dev?: boolean): Promise<void> {
  //const development = process.env.NODE_ENV == "development";
  const development = dev || target === undefined;

  fs.rmSync(buildDirectory, {recursive: true, force: true});
  fs.mkdirSync(buildDirectory, {recursive: true});

  const watchRebuildLogPlugin = {
    name: 'watchRebuildLogPlugin',
    setup(build) {
      build.onStart(() => {
        console.log('building');
      });
    },
  };

  const ctx = await esbuild.context({
    plugins: [watchRebuildLogPlugin],
    ...commonCLIConfig(development, target),
  });

  console.log('watching...');
  await ctx.watch();
}

const args = process.argv.slice(1);
if (args[1] && args[1].endsWith('npmBin')) {
  doBuild(null, false);

  fs.writeFileSync(
    path.join(buildDirectory, 'index.js'),
    // process.pkg is used by pkg but also we can set it here
    // so that debug output is not the default
    "#!/usr/bin/env node\nprocess.pkg = true;\nrequire('./src/index.js')"
  );
} else if (args[1] && args[1].endsWith('watch')) {
  doWatch(null, true);
} else if (args[0].endsWith('build')) {
  const target = args[1];
  doBuild(target);
}
