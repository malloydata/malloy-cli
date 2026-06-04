/*
 * Copyright Contributors to the Malloy project
 * SPDX-License-Identifier: MIT
 */

import path from 'path';
import {readPackageJson} from './utils/licenses';
import fs from 'fs';

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
let filePath: string;
let seen: {[id: string]: boolean} = {};

/*
 * Required components:
 * * The name of the component
 * * Identification of the component's license(s)
 * * The complete text of every unique license (at least once)
 * * The contents of any NOTICE file included with the component (if it includes one)
 */
export function generateDisclaimer(
  packageJsonPath: string,
  nodeModulesPath: string,
  disclaimerPath: string
): void {
  filePath = disclaimerPath;
  const rootPackageJson = readPackageJson(packageJsonPath);

  if (fs.existsSync(filePath)) {
    throw new Error(`${filePath} already exists`);
  }

  seen = {};
  console.log('Generating third party licenses');

  // include dev dependencies b/c we put all dependencies there so that npx malloy-cli
  // doesn't have to install dependencies for no good reason, as everything is bundled
  // when shipped to npm. This means that the license file also includes things we don't actually
  // ship, but it's a very short list anyways.
  doDependencies(nodeModulesPath, rootPackageJson, true);
  console.log(`Wrote ${filePath}`);
}

function doDependencies(
  nodeModulesPath: string,
  packageJson: any,
  includeDevDependencies = false
): void {
  // eslint-disable-next-line no-prototype-builtins

  // eslint-disable-next-line no-prototype-builtins
  let dependencies = packageJson.hasOwnProperty('dependencies')
    ? packageJson.dependencies
    : {};

  // eslint-disable-next-line no-prototype-builtins
  if (includeDevDependencies && packageJson.hasOwnProperty('devDependencies')) {
    dependencies = {...dependencies, ...packageJson.devDependencies};
  }

  if (Object.keys(dependencies).length > 0) {
    for (const dependency of Object.keys(dependencies)) {
      if (seen[dependency] === true || !(typeof dependency === 'string')) {
        continue;
      }

      const pkg = readPackageJson(
        path.join(nodeModulesPath, dependency, 'package.json')
      );

      // look for notice & license text
      let notice: string | undefined = undefined;
      let license: string | undefined = undefined;
      try {
        const packageFiles = fs.readdirSync(
          path.join(nodeModulesPath, dependency)
        );
        packageFiles.find(fileName => {
          const base = fileName.split('.')[0].toLowerCase();

          if (base === 'notice' || base === 'notices') {
            notice = fs.readFileSync(
              path.join(nodeModulesPath, dependency, fileName),
              'utf-8'
            );
          }

          if (base === 'license' || base === 'licenses') {
            license = fs.readFileSync(
              path.join(nodeModulesPath, dependency, fileName),
              'utf-8'
            );
          }
        });

        if (license === undefined && pkg.license === undefined) {
          throw new Error(
            `${dependency}: license type undefined in package.json and license file cannot be found`
          );
        }

        const licenseType = pkg.license
          ? pkg.license
          : 'see license text below';

        const url = [
          pkg.homepage,
          pkg.repository?.url,
          pkg.repository?.baseUrl,
          pkg.repo,
          `https://npmjs.com/package/${dependency}`,
        ].find(el => el !== undefined);

        fs.appendFileSync(
          filePath,
          `
  -------
  Package: ${dependency}
  Url: ${url}
  License(s): ${licenseType}
  ${license ? 'License Text:\n' + license + '\n' : ''}
  ${notice ? '\nNotice:\n' + notice + '\n' : ''}
          `
        );

        seen[dependency] = true;
        doDependencies(nodeModulesPath, pkg);
      } catch (error) {
        console.warn(
          'Could not read package.json',
          error instanceof Error ? error.message : `${error}`
        );
      }
    }
  }
}
