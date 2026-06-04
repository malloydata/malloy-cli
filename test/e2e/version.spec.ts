/*
 * Copyright Contributors to the Malloy project
 * SPDX-License-Identifier: MIT
 */

import path from 'path';
import {readPackageJson} from '../../scripts/utils/licenses';
import {withNpmCli} from './util';

describe('commands', () => {
  describe('vesion', () => {
    it('builds npmBin with proper version', () => {
      const packageVersion = readPackageJson(
        path.join(__dirname, '..', '..', 'package.json')
      ).version;

      expect(withNpmCli('-V').split('\n')[0]).toBe(packageVersion);
    });
  });
});
