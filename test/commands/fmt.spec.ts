/* Copyright Contributors to the Malloy project / SPDX-License-Identifier: MIT */

import {Command} from '@commander-js/extra-typings';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {createCLI} from '../../src/cli';

let cli: Command;
let tempDir: string;
let originalXDG: string | undefined;
let stdoutChunks: string[];
let stderrChunks: string[];
let stdoutSpy: jest.SpyInstance;
let stderrSpy: jest.SpyInstance;
let originalExitCode: number | undefined;

const UGLY = "run:duckdb.sql('select 1')->{select:* }";

beforeEach(() => {
  cli = createCLI();

  originalXDG = process.env['XDG_CONFIG_HOME'];
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'malloy-cli-fmt-test-'));
  // fmt doesn't load a malloy-config, but the preAction hook still runs
  // loadConfig — give it an empty config dir so XDG discovery succeeds.
  const malloyDir = path.join(tempDir, 'malloy');
  fs.mkdirSync(malloyDir, {recursive: true});
  fs.writeFileSync(
    path.join(malloyDir, 'malloy-config.json'),
    JSON.stringify({connections: {}})
  );
  process.env['XDG_CONFIG_HOME'] = tempDir;

  stdoutChunks = [];
  stderrChunks = [];
  stdoutSpy = jest
    .spyOn(process.stdout, 'write')
    .mockImplementation((chunk: string | Uint8Array) => {
      stdoutChunks.push(chunk.toString());
      return true;
    });
  stderrSpy = jest
    .spyOn(process.stderr, 'write')
    .mockImplementation((chunk: string | Uint8Array) => {
      stderrChunks.push(chunk.toString());
      return true;
    });

  originalExitCode =
    typeof process.exitCode === 'number' ? process.exitCode : undefined;
  process.exitCode = 0;
});

afterEach(() => {
  stdoutSpy.mockRestore();
  stderrSpy.mockRestore();
  process.exitCode = originalExitCode;
  if (originalXDG !== undefined) {
    process.env['XDG_CONFIG_HOME'] = originalXDG;
  } else {
    delete process.env['XDG_CONFIG_HOME'];
  }
  fs.rmSync(tempDir, {recursive: true, force: true});
});

async function runCli(...args: string[]): Promise<void> {
  await cli.parseAsync(['--quiet', ...args], {from: 'user'});
}

function writeFile(name: string, body: string): string {
  const p = path.join(tempDir, name);
  fs.writeFileSync(p, body);
  return p;
}

describe('commands.fmt', () => {
  it('formats a single file to stdout', async () => {
    const file = writeFile('a.malloy', UGLY);
    await runCli('fmt', file);
    expect(stdoutChunks.join('')).toContain("run: duckdb.sql('select 1') -> {");
    // Source on disk is unchanged.
    expect(fs.readFileSync(file, 'utf8')).toBe(UGLY);
  });

  it('rewrites in place with -w', async () => {
    const file = writeFile('a.malloy', UGLY);
    await runCli('fmt', '-w', file);
    const after = fs.readFileSync(file, 'utf8');
    expect(after).not.toBe(UGLY);
    expect(after).toContain("run: duckdb.sql('select 1') -> {");
  });

  it('--check exits non-zero and lists drift', async () => {
    const file = writeFile('a.malloy', UGLY);
    await runCli('fmt', '--check', file);
    expect(process.exitCode).toBe(1);
    // Source unchanged.
    expect(fs.readFileSync(file, 'utf8')).toBe(UGLY);
  });

  it('--check exits zero on already-formatted source', async () => {
    const file = writeFile('a.malloy', UGLY);
    await runCli('fmt', '-w', file);
    process.exitCode = 0;
    // Commander caches parsed options on the Command instance, so a fresh
    // CLI is required for a second invocation.
    cli = createCLI();
    await runCli('fmt', '--check', file);
    expect(process.exitCode).toBe(0);
  });

  it('reports parse errors and exits non-zero without writing', async () => {
    const broken = 'source: x is %%';
    const file = writeFile('broken.malloy', broken);
    await runCli('fmt', '-w', file);
    expect(process.exitCode).toBe(1);
    expect(fs.readFileSync(file, 'utf8')).toBe(broken);
    expect(stderrChunks.join('')).toMatch(/broken\.malloy:\d+:\d+/);
  });

  it('walks directories, skipping node_modules and dotdirs', async () => {
    fs.mkdirSync(path.join(tempDir, 'nested'), {recursive: true});
    fs.mkdirSync(path.join(tempDir, 'node_modules', 'pkg'), {recursive: true});
    fs.mkdirSync(path.join(tempDir, '.hidden'), {recursive: true});
    const a = writeFile('a.malloy', UGLY);
    const b = path.join(tempDir, 'nested', 'b.malloy');
    fs.writeFileSync(b, UGLY);
    const ignored1 = path.join(tempDir, 'node_modules', 'pkg', 'c.malloy');
    fs.writeFileSync(ignored1, UGLY);
    const ignored2 = path.join(tempDir, '.hidden', 'd.malloy');
    fs.writeFileSync(ignored2, UGLY);

    await runCli('fmt', '-w', tempDir);

    expect(fs.readFileSync(a, 'utf8')).not.toBe(UGLY);
    expect(fs.readFileSync(b, 'utf8')).not.toBe(UGLY);
    expect(fs.readFileSync(ignored1, 'utf8')).toBe(UGLY);
    expect(fs.readFileSync(ignored2, 'utf8')).toBe(UGLY);
  });

  it('errors when multiple files are passed without -w or --check', async () => {
    const a = writeFile('a.malloy', UGLY);
    const b = writeFile('b.malloy', UGLY);
    expect.assertions(1);
    await runCli('fmt', a, b).catch((e: Error) =>
      expect(e.message).toMatch(/Multiple files require/)
    );
  });

  it('rejects -w and --check together', async () => {
    const file = writeFile('a.malloy', UGLY);
    expect.assertions(1);
    await runCli('fmt', '-w', '--check', file).catch((e: Error) =>
      expect(e.message).toMatch(/cannot be used with option/)
    );
  });
});
