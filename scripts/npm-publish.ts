#!/usr/bin/env ts-node
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

import {execSync} from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const PACKAGE_JSON_PATH = path.join(__dirname, '..', 'package.json');

interface Args {
  tag: 'next' | 'latest';
  dryRun: boolean;
  bumpType?: 'patch' | 'minor' | 'major';
}

function parseArgs(): Args {
  const args = process.argv.slice(2);

  if (args.length === 0 || !['next', 'latest'].includes(args[0])) {
    console.error(
      'Usage: npm run npm-publish <next|latest> [--dry-run] [--bump-type=patch|minor|major]'
    );
    console.error('');
    console.error('Examples:');
    console.error('  npm run npm-publish next');
    console.error('  npm run npm-publish next --dry-run');
    console.error('  npm run npm-publish latest --bump-type=minor');
    console.error('  npm run npm-publish latest --bump-type=patch --dry-run');
    process.exit(1);
  }

  const tag = args[0] as 'next' | 'latest';
  const dryRun = args.includes('--dry-run');
  const bumpTypeArg = args.find(arg => arg.startsWith('--bump-type='));
  const bumpType = bumpTypeArg?.split('=')[1] as
    | 'patch'
    | 'minor'
    | 'major'
    | undefined;

  if (tag === 'latest' && !bumpType) {
    console.error(
      '❌ Error: --bump-type=<patch|minor|major> is required for latest releases'
    );
    process.exit(1);
  }

  if (
    tag === 'latest' &&
    bumpType &&
    !['patch', 'minor', 'major'].includes(bumpType)
  ) {
    console.error('❌ Error: --bump-type must be one of: patch, minor, major');
    process.exit(1);
  }

  return {tag, dryRun, bumpType};
}

function exec(command: string, silent = false): string {
  if (!silent) {
    console.log(`> ${command}`);
  }
  const result = execSync(command, {
    encoding: 'utf-8',
    stdio: silent ? 'pipe' : 'inherit',
  });
  // When stdio is 'inherit', execSync returns null
  return result ? result.trim() : '';
}

function execQuiet(command: string): string {
  return execSync(command, {encoding: 'utf-8', stdio: 'pipe'}).trim();
}

function getPackageJson(): {version: string; name: string} {
  return JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
}

function getGitShortSha(): string {
  return execQuiet('git rev-parse --short=7 HEAD');
}

function getDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

function checkGitStatus(): void {
  // Clean untracked files (like temporary credentials from GitHub Actions)
  console.log('🧹 Cleaning untracked files...');
  execQuiet('git clean -fdx');

  const status = execQuiet('git status --porcelain');
  if (status) {
    console.error(
      '❌ Error: Working directory is not clean. Please commit or stash changes first.'
    );
    console.error('Uncommitted changes:');
    console.error(status);
    process.exit(1);
  }
}

function publishNext(dryRun: boolean): void {
  console.log('📦 Publishing to @next tag...\n');

  const pkg = getPackageJson();
  const baseVersion = pkg.version;
  const dateStr = getDateString();
  const sha = getGitShortSha();
  const nextVersion = `${baseVersion}-next.${dateStr}.${sha}`;

  console.log(`Current version: ${baseVersion}`);
  console.log(`Next version: ${nextVersion}\n`);

  // Temporarily set version using npm
  exec(`npm version --no-git-tag-version ${nextVersion}`, true);

  try {
    // Run package-npm to prepare for publishing
    console.log('📦 Running package-npm...\n');
    exec('npm run package-npm');

    // Publish to npm with next tag
    if (dryRun) {
      console.log('\n🧪 DRY RUN: Testing npm publish (no actual upload)\n');
      exec('npm publish --tag next --dry-run');
      console.log('\n✅ Dry run completed successfully!');
    } else {
      console.log('\n🚀 Publishing to npm...\n');
      exec('npm publish --tag next');
      console.log(
        `\n✅ Successfully published ${pkg.name}@${nextVersion} to npm!`
      );
      console.log(
        `📍 View at: https://www.npmjs.com/package/${pkg.name}/v/${nextVersion}`
      );
    }
  } finally {
    // Restore original version
    exec(`npm version --no-git-tag-version ${baseVersion}`, true);
    console.log(`\n🔄 Restored package.json to version ${baseVersion}`);
  }
}

function publishLatest(
  bumpType: 'patch' | 'minor' | 'major',
  dryRun: boolean
): void {
  console.log('📦 Publishing to @latest tag...\n');

  checkGitStatus();

  const pkg = getPackageJson();
  const oldVersion = pkg.version;

  // DEBUG: Before npm version
  console.log('=== DEBUG: BEFORE npm version ===');
  exec('echo "npm path: $(which npm)"');
  exec('echo "npm version: $(npm --version)"');
  exec('echo "node version: $(node --version)"');
  exec('echo "PATH: $PATH" | head -c 200');
  exec('ls -la node_modules/.bin/ts-node || echo "ts-node not found"');
  exec('echo "CWD: $(pwd)"');
  console.log('=================================\n');

  // Bump version using npm (updates both package.json and package-lock.json)
  exec(`npm version --no-git-tag-version ${bumpType}`);

  // DEBUG: After npm version
  console.log('=== DEBUG: AFTER npm version ===');
  exec('echo "npm path: $(which npm)"');
  exec('echo "npm version: $(npm --version)"');
  exec('ls -la node_modules/.bin/ts-node || echo "ts-node not found"');
  console.log('=================================\n');

  // Get the new version after bump
  const newVersion = getPackageJson().version;

  console.log(`Bumped version from ${oldVersion} to ${newVersion} (${bumpType})\n`);

  try {
    // Run package-npm to prepare for publishing
    console.log('📦 Running package-npm...\n');
    exec('npm run package-npm');

    // Publish to npm
    if (dryRun) {
      console.log('\n🧪 DRY RUN: Testing npm publish (no actual upload)\n');
      exec('npm publish --dry-run');
      console.log('\n✅ Dry run completed successfully!');
      console.log('(No git operations performed in dry run mode)');
    } else {
      console.log('\n🚀 Publishing to npm...\n');
      exec('npm publish');
      console.log(
        `\n✅ Successfully published ${pkg.name}@${newVersion} to npm!`
      );

      // Also tag as 'next' so next points to the latest stable release
      console.log('\n🏷️  Tagging as @next...');
      exec(`npm dist-tag add ${pkg.name}@${newVersion} next`);
      console.log('✅ Updated @next tag to point to this version');

      // Commit and tag
      console.log('\n📝 Committing version bump...');
      exec('git add package.json package-lock.json');
      exec(`git commit -m "chore: bump version to ${newVersion}"`);

      console.log(`\n🏷️  Creating git tag v${newVersion}...`);
      exec(`git tag v${newVersion}`);

      console.log('\n⬆️  Pushing to remote...');
      exec('git push origin main');
      exec(`git push origin v${newVersion}`);

      console.log(
        `\n✅ Successfully published, committed, and tagged ${pkg.name}@${newVersion}!`
      );
      console.log(
        `📍 View at: https://www.npmjs.com/package/${pkg.name}/v/${newVersion}`
      );
      console.log(
        `🏷️  Tag: https://github.com/malloydata/malloy-cli/releases/tag/v${newVersion}`
      );
    }
  } catch (error) {
    // If anything fails, restore the old version
    console.error('\n❌ Error occurred during publishing:');
    console.error(error);
    console.log('\n🔄 Restoring package.json to original version...');
    exec(`npm version --no-git-tag-version ${oldVersion}`, true);
    process.exit(1);
  } finally {
    // In dry-run mode, restore the version
    if (dryRun) {
      console.log(`\n🔄 Restored package.json to version ${oldVersion}`);
      exec(`npm version --no-git-tag-version ${oldVersion}`, true);
    }
  }
}

function main(): void {
  const args = parseArgs();

  console.log('========================================');
  console.log('📦 Malloy CLI NPM Publisher');
  console.log('========================================\n');

  if (args.dryRun) {
    console.log('🧪 DRY RUN MODE - No actual publishing will occur\n');
  }

  if (args.tag === 'next') {
    publishNext(args.dryRun);
  } else {
    publishLatest(args.bumpType!, args.dryRun);
  }
}

main();
