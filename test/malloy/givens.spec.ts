/* Copyright Contributors to the Malloy project / SPDX-License-Identifier: MIT */

import fs from 'fs';
import os from 'os';
import path from 'path';
import {parseGivensSpec} from '../../src/malloy/givens';

describe('parseGivensSpec', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'malloy-cli-givens-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, {recursive: true, force: true});
  });

  describe('inline JSON', () => {
    it('parses an object', () => {
      expect(parseGivensSpec('{"TENANT":"acme","MAX":100}')).toEqual({
        TENANT: 'acme',
        MAX: 100,
      });
    });

    it('handles nested compound values', () => {
      expect(parseGivensSpec('{"CAPS":["a","b"],"S":{"id":1}}')).toEqual({
        CAPS: ['a', 'b'],
        S: {id: 1},
      });
    });

    it('accepts an empty object', () => {
      expect(parseGivensSpec('{}')).toEqual({});
    });

    it('rejects invalid JSON', () => {
      expect(() => parseGivensSpec('{not json')).toThrow(/invalid JSON/);
    });

    it('rejects a top-level array', () => {
      expect(() => parseGivensSpec('[1,2]')).toThrow(
        /expected a JSON object .* got array/
      );
    });

    it('rejects a top-level scalar', () => {
      expect(() => parseGivensSpec('"hi"')).toThrow(
        /expected a JSON object .* got string/
      );
    });

    it('rejects top-level null', () => {
      expect(() => parseGivensSpec('null')).toThrow(
        /expected a JSON object .* got null/
      );
    });
  });

  describe('@file', () => {
    it('reads JSON from a file', () => {
      const p = path.join(tempDir, 'g.json');
      fs.writeFileSync(p, '{"X":1}');
      expect(parseGivensSpec(`@${p}`)).toEqual({X: 1});
    });

    it('reports the file path on missing file', () => {
      const p = path.join(tempDir, 'nope.json');
      expect(() => parseGivensSpec(`@${p}`)).toThrow(
        new RegExp(`cannot read ${p.replace(/\//g, '\\/')}`)
      );
    });

    it('reports the file path on invalid JSON', () => {
      const p = path.join(tempDir, 'bad.json');
      fs.writeFileSync(p, '{nope');
      expect(() => parseGivensSpec(`@${p}`)).toThrow(
        new RegExp(`${path.basename(p)}.*invalid JSON`)
      );
    });
  });

  describe('@- (stdin)', () => {
    it('reads from the injected stdin reader', () => {
      const got = parseGivensSpec('@-', {readStdin: () => '{"FROM":"stdin"}'});
      expect(got).toEqual({FROM: 'stdin'});
    });

    it('reports <stdin> on invalid JSON from stdin', () => {
      expect(() => parseGivensSpec('@-', {readStdin: () => 'garbage'})).toThrow(
        /<stdin>.*invalid JSON/
      );
    });
  });
});
