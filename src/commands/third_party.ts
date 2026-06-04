/*
 * Copyright Contributors to the Malloy project
 * SPDX-License-Identifier: MIT
 */

import path from 'path';
import {out} from '../log';
import fs from 'fs';

export function showThirdPartyCommand(): void {
  out(
    fs.readFileSync(path.join(__dirname, 'third_party_notices.txt')).toString()
  );
}
