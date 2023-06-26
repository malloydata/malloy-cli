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
import {spawnSync} from 'child_process';
import {readPackageJson} from '../../scripts/utils/licenses';

describe('commands', () => {
  describe('vesion', () => {
    it('builds npmBin with proper version', () => {
      const packageVersion = readPackageJson(
        path.join(__dirname, '..', '..', 'package.json')
      ).version;

      const buildPath = path.join(
        __dirname,
        '..',
        '.build',
        'npmBin',
        'index.js'
      );

      const result = spawnSync('node', [buildPath, '-V'], {
        stdio: 'pipe',
        encoding: 'utf-8',
      });

      expect(result.stdout.trim()).toBe(packageVersion);
    });
  });
});
