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

// Maps platform-arch targets to the @duckdb/node-bindings-* package that
// contains the native .node binary.  With duckdb-node-neo the binaries are
// installed via npm optional dependencies — no HTTP fetching required.

export const targetDuckDBPackageMap: Record<string, string> = {
  'darwin-arm64': '@duckdb/node-bindings-darwin-arm64',
  'darwin-x64': '@duckdb/node-bindings-darwin-x64',
  'linux-arm64': '@duckdb/node-bindings-linux-arm64',
  'linux-x64': '@duckdb/node-bindings-linux-x64',
  'win32-x64': '@duckdb/node-bindings-win32-x64',
};

/**
 * Resolve the path to the native duckdb .node file for a given target.
 * The file lives inside the platform-specific @duckdb/node-bindings-* package.
 */
export function resolveDuckDBNative(target: string): string {
  const pkg = targetDuckDBPackageMap[target];
  if (!pkg) {
    throw new Error(`No DuckDB native binding package for target: ${target}`);
  }
  return require.resolve(`${pkg}/duckdb.node`);
}
