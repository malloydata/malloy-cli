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

// Reads the platform-specific native binding packages directly from
// @duckdb/node-bindings/package.json so we never fall out of sync.

import fs from 'fs';

const BINDINGS_PREFIX = '@duckdb/node-bindings-';

interface DuckDBBindingsPackageJson {
  optionalDependencies?: Record<string, string>;
}

function readBindingsPackageJson(): DuckDBBindingsPackageJson {
  const pkgPath = require.resolve('@duckdb/node-bindings/package.json');
  return JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
}

/**
 * Returns the optionalDependencies from @duckdb/node-bindings — the
 * canonical set of platform-specific native binding packages and their
 * versions. Example: { "@duckdb/node-bindings-linux-arm64": "1.4.3-r.1" }
 */
export function getDuckDBNativePackages(): Record<string, string> {
  const pkg = readBindingsPackageJson();
  const deps = pkg.optionalDependencies;
  if (!deps || Object.keys(deps).length === 0) {
    throw new Error(
      '@duckdb/node-bindings has no optionalDependencies — cannot determine native binding packages'
    );
  }
  return deps;
}

/**
 * Returns the package names as an array, for use as esbuild externals.
 */
export function getDuckDBExternals(): string[] {
  return Object.keys(getDuckDBNativePackages());
}

/**
 * Maps "platform-arch" targets (e.g. "linux-arm64") to the @duckdb
 * package name that contains the native .node binary.  The target
 * key is simply the package name with the "@duckdb/node-bindings-"
 * prefix stripped, so new platforms added by duckdb are picked up
 * automatically.
 */
export function getTargetDuckDBPackageMap(): Record<string, string> {
  const packages = getDuckDBNativePackages();
  const map: Record<string, string> = {};
  for (const pkg of Object.keys(packages)) {
    if (pkg.startsWith(BINDINGS_PREFIX)) {
      map[pkg.slice(BINDINGS_PREFIX.length)] = pkg;
    }
  }
  return map;
}

/**
 * Resolve the path to the native duckdb .node file for a given target.
 */
export function resolveDuckDBNative(target: string): string {
  const map = getTargetDuckDBPackageMap();
  const pkg = map[target];
  if (!pkg) {
    throw new Error(`No DuckDB native binding package for target: ${target}`);
  }
  return require.resolve(`${pkg}/duckdb.node`);
}
