/*
 * Copyright Contributors to the Malloy project
 * SPDX-License-Identifier: MIT
 */

import {run} from './cli';
run().catch(err => {
  console.error(err);
  process.exit(1);
});
