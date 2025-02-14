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

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */

/*
 * This script produces a CSV useful for evaluating licenses for third-party software incuded in a binary, and
 * is a bit more complex than it might need to be because we need to satisfy lawyers with direct links to license files for packages
 * (not just links to the module on npmjs.com)
 * It requires one argument, the filename of the CSV. It outputs a CSV with columns described in `outputRow` interface
 */

import {execSync} from 'child_process';
// eslint-disable-next-line node/no-unpublished-import
import axios from 'axios';
import https from 'https';
import fs from 'fs';
// eslint-disable-next-line node/no-unpublished-import
import {stringify} from 'csv-stringify';
import {readPackageJson} from './utils/licenses';
import path from 'path';
import {errorMessage} from '../src/util';

interface OutputRow {
  name: string;
  url?: string;
  licenseLink?: string;
  licenseName?: string;
  binaryName?: string;
  copyrightIncluded?: string;
  sourceCodeIncluded?: string;
  hasNoticeFile?: string;
}

const outputFile = process.argv[2];
if (!outputFile) throw new Error('Output file required as argument');
if (fs.existsSync(outputFile)) throw new Error('Output file exists already');

axios.defaults.timeout = 500000;
axios.defaults.httpsAgent = new https.Agent({keepAlive: true});

// licenses that we would need to mirror source for, if we included (we don't today)
const sourceMirrorLicenses = [
  'CDDL-1.0',
  'CDDL-1.1',
  'CECILL-C',
  'CPL-1.0',
  'EPL-1.0',
  'EPL-2.0',
  'IPL-1.0',
  'MPL-1.0',
  'MPL-1.1',
  'MPL-2.0',
  'APSL-1.0',
  'APSL-1.1',
  'APSL-1.2',
  'APSL-2.0',
  'Ruby',
];

// packages that don't provide license files in standard places
const licenseFoundElsewhere: {[id: string]: string} = {
  ip: 'https://github.com/indutny/node-ip#license',
  'agent-base':
    'https://github.com/TooTallNate/proxy-agents/tree/main/packages/agent-base#license',
  'https-proxy-agent':
    'https://github.com/TooTallNate/proxy-agents/tree/main/packages/https-proxy-agent#license',
  'http-proxy-agent':
    'https://github.com/TooTallNate/proxy-agents/tree/main/packages/http-proxy-agent#license',
  'socks-proxy-agent':
    'https://github.com/TooTallNate/proxy-agents/tree/main/packages/socks-proxy-agent#license',
  crypt: 'https://github.com/pvorb/node-crypt/blob/master/LICENSE.mkd',
  'err-code': 'https://github.com/IndigoUnited/js-err-code#license',
  'data-uri-to-buffer':
    'https://github.com/TooTallNate/proxy-agents/tree/main/packages/data-uri-to-buffer#license',
  eastasianwidth: 'https://www.npmjs.com/package/eastasianwidth',
  '@75lb/deep-merge': 'https://www.npmjs.com/package/@75lb/deep-merge',
  ent: 'https://www.npmjs.com/package/ent',
  'pg-types': 'https://github.com/brianc/node-pg-types#license',
  pgpass: 'https://github.com/hoegaarden/pgpass#license',
  'packet-reader': 'https://github.com/brianc/node-packet-reader#license',
  'minipass-pipeline': 'https://www.npmjs.com/package/minipass-pipeline',
  'minipass-collect': 'https://www.npmjs.com/package/minipass-collect',
};

const packagesWithoutLocationsSpecified: {[id: string]: string} = {};

const getLicenses = async () => {
  const out: OutputRow[] = [];
  const errors: [string, Error][] = [];

  // NOTE!! We don't use "dependencies" for our packaged dependencies, because if we did,
  // people using the CLI with `npx malloy-cli ...` or `npm install -g @malloydata/cli` would have
  // to wait for all dependencies to install as well, even though they are packaged into the built
  // CLI code already. Instead, we keep a list of "builtIntoPackageDependencies"
  const dependenciesInPackage: string[] = (
    await (<any>readPackageJson(path.join('package.json')))
  ).builtIntoPackageDependencies;

  const seen: string[] = [];
  const dependenciesForPackage = (pkg: string): OutputRow[] => {
    if (!seen.find(a => a === pkg)) {
      seen.push(pkg);
      console.log(`npm view ${pkg} dependencies repository.url license --json`);
      const results = JSON.parse(
        execSync(
          `npm view ${pkg} dependencies repository.url license --json`
        ).toString()
      );

      const subDependencies = results.dependencies
        ? Object.keys(results.dependencies).map(pkg =>
            dependenciesForPackage(pkg)
          )
        : [];

      return [
        {
          name: pkg,
          binaryName: 'Malloy CLI',
          url: results['repository.url'],
          licenseName: results.license,
        },
        ...subDependencies.flat(),
      ];
    } else return [];
  };

  const dependencies = dependenciesInPackage
    .map(dep => dependenciesForPackage(dep))
    .flat()
    .filter(a => a.name)
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const dependency of dependencies) {
    const name = dependency.name;
    const row: OutputRow = dependency;
    const url = dependency.url;

    if (Object.keys(licenseFoundElsewhere).includes(name)) {
      row.licenseLink = licenseFoundElsewhere[name];
    } else if (!url) {
      row.licenseLink = 'UNKNOWN';
    } else {
      // attempt to get license link using packages url to repo
      // some formats:
      //  git+https://github.com/...
      //  git://github.com/....
      //  git@github.com:.....git
      //  git+ssh://git@github.com...
      //  https://github.com/...

      let httpURL: string;
      if (url.startsWith('git+https://')) {
        httpURL = url.replace('git+', '');
      } else if (url.startsWith('git://')) {
        httpURL = url.replace('git', 'https');
      } else if (url.startsWith('git@')) {
        httpURL = url.replace('git@', 'https://');
      } else if (url.startsWith('git+ssh://git@')) {
        httpURL = url.replace('git+ssh://git@', 'https://');
      } else {
        httpURL = url.replace('http://', 'https://');
      }

      // deal with git URLs
      if (httpURL.endsWith('.git')) {
        httpURL = httpURL.slice(0, -4);
      }
      if (httpURL.indexOf(':', 6) !== -1) {
        const index = httpURL.indexOf(':', 6);
        httpURL = httpURL.substr(0, index) + '/' + httpURL.substr(index + 1);
      }

      // filenames roughly ordered by occurence so we search faster
      const licenseFileNames = [
        'LICENSE',
        'License',
        'LICENCE',
        'LICENSE-MIT',
        'license',
      ];
      const licenseExtensions = ['', '.md', '.txt', '.mkd'];
      const defaultBranchNames = ['blob/main/', 'blob/master/', '']; // "" is because some sub-packages already have branch name embedded in package URL

      // some packages don't include a url
      if (
        httpURL === 'Unknown' &&
        Object.keys(packagesWithoutLocationsSpecified).includes(name)
      ) {
        httpURL = packagesWithoutLocationsSpecified[name];
      }

      if (httpURL === 'Unknown') {
        row.licenseLink = 'TODO';
      } else {
        console.log(`searching for ${row.name} at ${httpURL}`);

        outer: for (const fileName of licenseFileNames) {
          for (const branch of defaultBranchNames) {
            for (const extension of licenseExtensions) {
              const licenseLink = `${httpURL}/${branch}${fileName}${extension}`;

              try {
                // stop GH/etc from limiting us
                await new Promise(resolve => setTimeout(resolve, 700));

                const license = await axios.head(licenseLink);
                if (license) {
                  row.licenseLink = licenseLink;
                  break outer;
                }
              } catch (e) {
                if (axios.isAxiosError(e)) {
                  if (!e.response || e.response.status !== 404) {
                    console.warn(`ERROR: ${errorMessage(e)}`);
                    errors.push([name, e]);
                  }
                } else throw e;
              }
            }
          }
        }
      }

      if (!row.licenseLink) {
        console.warn('WARN: could not find license for ' + httpURL);
        row.licenseLink = 'TODO';
      }
    }

    row.copyrightIncluded = 'true';

    // if we happened to add a lib with a mirror-required license, mark a TODO
    if (sourceMirrorLicenses.includes(row.licenseName as string)) {
      row.sourceCodeIncluded = 'TODO';
    } else row.sourceCodeIncluded = 'false';

    out.push(row as OutputRow);
  }

  stringify(
    out,
    {
      columns: [
        'name',
        'licenseLink',
        'licenseName',
        'binaryName',
        'copyrightIncluded',
        'sourceCodeIncluded',
      ],
    },
    (err: any, output: string) => {
      fs.writeFileSync(outputFile, output);
    }
  );

  if (errors.length > 0) {
    for (const e of errors) {
      console.log(e);
    }
    console.log(
      "Finished with errors. There may still be TODOs - search for 'TODO' in the output"
    );
  } else {
    console.log(
      "Finished successfully. There may still be TODOs - search for 'TODO' in the output"
    );
  }
};

getLicenses();
