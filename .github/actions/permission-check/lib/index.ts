/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as core from '@actions/core';
import * as github from '@actions/github';

const token = core.getInput('github_token') || process.env.GITHUB_TOKEN;
if (!token) {
  console.log('Unable to access Github token');
  process.exit(1);
}
const octokit = github.getOctokit(token);

const PERMS = {
  none: 0,
  read: 1,
  write: 2,
  admin: 3,
};

const username = core.getInput('username') || github.context.actor;
const errorMessage = core.getInput('error_message');
const required = core.getInput('permission') || 'write';

(async () => {
  core.info(`Checking ${username} for permission: ${required}`);

  let permission = 'none';
  try {
    const response = await octokit.rest.repos.getCollaboratorPermissionLevel({
      ...github.context.repo,
      username,
    });
    permission = response.data.permission;
  } catch (error) {
    core.error(`Fetching permission failed ${error.message}`);
  }

  core.info(`Got: ${permission}`);

  if (PERMS[permission] < PERMS[required]) {
    if (errorMessage) core.error(errorMessage);
    process.exit(1);
  } else {
    process.exit(0);
  }
})();
