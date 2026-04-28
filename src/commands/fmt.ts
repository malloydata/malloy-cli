/* Copyright Contributors to the Malloy project / SPDX-License-Identifier: MIT */

import fs from 'fs';
import path from 'path';
import {prettifyMalloy, PrettifyError} from '../malloy/prettify';
import {out} from '../log';
import {exitWithError} from '../util';

export interface FmtOptions {
  write?: true;
  check?: true;
}

export async function fmtCommand(
  paths: string[],
  options: FmtOptions
): Promise<void> {
  // No paths → read stdin, write formatted to stdout. Useful for editor
  // integrations and `cat foo.malloy | malloy fmt`.
  if (paths.length === 0) {
    const src = await readStdin();
    const {formatted, errors} = prettifyMalloy(src);
    if (errors.length > 0) {
      reportErrors('<stdin>', errors);
      process.exitCode = 1;
      return;
    }
    process.stdout.write(formatted);
    return;
  }

  const files = collectFiles(paths);
  if (files.length === 0) {
    exitWithError('No .malloy files found.');
  }

  let changed = 0;
  let failed = 0;

  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    const {formatted, errors} = prettifyMalloy(src);

    if (errors.length > 0) {
      reportErrors(file, errors);
      failed++;
      continue;
    }

    const isDifferent = formatted !== src;

    if (options.check) {
      if (isDifferent) {
        out(file);
        changed++;
      }
    } else if (options.write) {
      if (isDifferent) {
        fs.writeFileSync(file, formatted, 'utf8');
        out(file);
        changed++;
      }
    } else {
      // No -w, no --check: print to stdout. With multiple files this is
      // ambiguous; require a flag.
      if (files.length > 1) {
        exitWithError(
          'Multiple files require --write (write in place) or --check.'
        );
      }
      process.stdout.write(formatted);
    }
  }

  if (failed > 0) {
    process.exitCode = 1;
    return;
  }
  if (options.check && changed > 0) {
    process.exitCode = 1;
  }
}

function collectFiles(paths: string[]): string[] {
  const acc: string[] = [];
  for (const p of paths) {
    if (!fs.existsSync(p)) {
      exitWithError(`Path does not exist: ${p}`);
    }
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      walk(p, acc);
    } else if (isMalloyFile(p)) {
      acc.push(p);
    } else {
      exitWithError(`Not a .malloy file: ${p}`);
    }
  }
  return acc;
}

function walk(dir: string, acc: string[]): void {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, acc);
    } else if (entry.isFile() && isMalloyFile(full)) {
      acc.push(full);
    }
  }
}

function isMalloyFile(p: string): boolean {
  return path.extname(p).toLowerCase() === '.malloy';
}

function reportErrors(label: string, errors: PrettifyError[]): void {
  for (const e of errors) {
    process.stderr.write(`${label}:${e.line}:${e.column} ${e.message}\n`);
  }
}

async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    process.stdin.on('data', c => chunks.push(c));
    process.stdin.on('end', () =>
      resolve(Buffer.concat(chunks).toString('utf8'))
    );
    process.stdin.on('error', reject);
  });
}
