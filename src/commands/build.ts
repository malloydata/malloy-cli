/* Copyright Contributors to the Malloy project / SPDX-License-Identifier: MIT */

import {buildFiles} from '../malloy/build';

export async function buildCommand(
  paths: string[],
  options: {refresh?: string[]; dryRun?: true}
): Promise<void> {
  const refresh = new Set(options.refresh ?? []);
  await buildFiles(paths, {
    refresh,
    dryRun: options.dryRun === true,
  });
}
