/*
 * Copyright Contributors to the Malloy project
 * SPDX-License-Identifier: MIT
 */

import {spawnSync} from 'child_process';
import path from 'path';

export function withNpmCli(...args: string[]): string {
  const buildPath = path.join(__dirname, '..', '.build', 'npmBin', 'index.js');

  const result = spawnSync('node', [buildPath, ...args], {
    stdio: 'pipe',
    encoding: 'utf-8',
  });

  return result.stdout.trim();
}
