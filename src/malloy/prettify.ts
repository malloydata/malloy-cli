/* Copyright Contributors to the Malloy project / SPDX-License-Identifier: MIT */

// Adapter for the experimental Malloy prettifier exported from
// `@malloydata/malloy/internal`. The /internal surface carries no stability
// commitment; it will eventually move to a `@malloydata/syntax` package and
// the /internal entry point will vanish. Keep this the only file in the CLI
// that imports prettify so the migration is one edit.

import {prettify as internalPrettify} from '@malloydata/malloy/internal';

export type {PrettifyError} from '@malloydata/malloy/internal';

export interface PrettifyResult {
  formatted: string;
  errors: ReturnType<typeof internalPrettify>['errors'];
}

export function prettifyMalloy(src: string): PrettifyResult {
  const {result, errors} = internalPrettify(src);
  return {formatted: result, errors};
}
