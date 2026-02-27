#!/usr/bin/env ts-node
/**
 * Syncs @duckdb/node-bindings devDependency and optionalDependencies
 * to match the version required by the installed @duckdb/node-api.
 *
 * Run after updating malloy packages (which may pull in a new node-api).
 */
import fs from 'fs';
import path from 'path';

const PKG_PATH = path.resolve(__dirname, '..', 'package.json');

// Read the installed @duckdb/node-api to find what node-bindings version it wants
const nodeApiPkg = JSON.parse(
  fs.readFileSync(require.resolve('@duckdb/node-api/package.json'), 'utf-8')
);
const wantedBindingsVersion: string =
  nodeApiPkg.dependencies?.['@duckdb/node-bindings'];
if (!wantedBindingsVersion) {
  console.error(
    'Could not determine @duckdb/node-bindings version from @duckdb/node-api'
  );
  process.exit(1);
}

// Read our package.json
const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf-8'));
const currentBindingsVersion: string =
  pkg.devDependencies?.['@duckdb/node-bindings'];

const currentApiVersion: string = pkg.devDependencies?.['@duckdb/node-api'];

if (
  currentBindingsVersion === wantedBindingsVersion &&
  currentApiVersion === nodeApiPkg.version
) {
  console.log('@duckdb packages already in sync, no update needed');
  process.exit(0);
}

if (currentApiVersion !== nodeApiPkg.version) {
  console.log(
    `@duckdb/node-api: ${currentApiVersion} -> ${nodeApiPkg.version}`
  );
}
if (currentBindingsVersion !== wantedBindingsVersion) {
  console.log(
    `@duckdb/node-bindings: ${currentBindingsVersion} -> ${wantedBindingsVersion}`
  );
}

// Update devDependencies
pkg.devDependencies['@duckdb/node-api'] = nodeApiPkg.version;
pkg.devDependencies['@duckdb/node-bindings'] = wantedBindingsVersion;

// Update optionalDependencies (platform-specific native packages)
// Read from the NEW node-bindings package to get platform packages.
// Since we haven't installed the new version yet, read from node-api's
// dependency declaration — platform packages use the same version.
const BINDINGS_PREFIX = '@duckdb/node-bindings-';
const currentOptional = pkg.optionalDependencies || {};
const updatedOptional: Record<string, string> = {};
for (const [name, version] of Object.entries(currentOptional)) {
  if (name.startsWith(BINDINGS_PREFIX)) {
    updatedOptional[name] = wantedBindingsVersion;
  } else {
    updatedOptional[name] = version as string;
  }
}
pkg.optionalDependencies = updatedOptional;

fs.writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + '\n');
console.log('Updated package.json');
