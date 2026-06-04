/*
 * Copyright Contributors to the Malloy project
 * SPDX-License-Identifier: MIT
 */

import {runOrCompile} from '../malloy/util';
import {parseGivensSpec} from '../malloy/givens';
import {exitWithError} from '../util';

export async function runCommand(
  source: string,
  query: string | undefined,
  options: {
    index?: number | undefined;
    name?: string | undefined;
    json?: true | undefined;
    rowLimit?: number | undefined;
    givens?: string | undefined;
  }
): Promise<void> {
  let givens;
  if (options.givens !== undefined) {
    try {
      givens = parseGivensSpec(options.givens);
    } catch (e) {
      exitWithError(e instanceof Error ? e.message : String(e));
    }
  }
  await runOrCompile(source, query, {...options, givens});
}
