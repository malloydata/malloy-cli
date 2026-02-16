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

import {
  ConnectionConfigEntry,
  TestableConnection,
  createConnectionsFromConfig,
  getConnectionProperties,
  getRegisteredConnectionTypes,
} from '@malloydata/malloy';
import {config, saveConfig} from '../config';
import {out} from '../log';
import {errorMessage, exitWithError} from '../util';

function formatPropertiesTable(typeName: string): string {
  const props = getConnectionProperties(typeName);
  if (!props) return '';

  const nameWidth = Math.max(...props.map(p => p.name.length));
  const typeWidth = Math.max(...props.map(p => p.type.length));

  const lines = props.map(p => {
    const name = p.name.padEnd(nameWidth);
    const type = p.type.padEnd(typeWidth);
    const parts = [p.description || p.displayName];
    if (p.default) parts.push(`(default: ${p.default})`);
    if (!p.optional) parts.push('(required)');
    return `  ${name}  ${type}  ${parts.join(' ')}`;
  });

  return lines.join('\n');
}

function connectionEntryFromName(
  name: string
): ConnectionConfigEntry | undefined {
  return config.connections[name];
}

function parseKeyValuePairs(
  kvPairs: string[],
  typeName: string
): Record<string, string | number | boolean> {
  const props = getConnectionProperties(typeName);
  if (!props) exitWithError(`Unknown connection type: ${typeName}`);

  const propMap = new Map(props.map(p => [p.name, p]));
  const result: Record<string, string | number | boolean> = {};

  for (const pair of kvPairs) {
    const eqIndex = pair.indexOf('=');
    if (eqIndex === -1)
      exitWithError(`Invalid property format: ${pair} (expected key=value)`);

    const key = pair.substring(0, eqIndex);
    const value = pair.substring(eqIndex + 1);
    const propDef = propMap.get(key);
    if (!propDef)
      exitWithError(
        `Unknown property "${key}" for connection type "${typeName}"\n\nProperties for ${typeName}:\n${formatPropertiesTable(
          typeName
        )}`
      );

    switch (propDef.type) {
      case 'number':
        {
          const num = parseFloat(value);
          if (isNaN(num))
            exitWithError(`Property "${key}" must be a number, got "${value}"`);
          result[key] = num;
        }
        break;
      case 'boolean':
        if (value !== 'true' && value !== 'false')
          exitWithError(
            `Property "${key}" must be true or false, got "${value}"`
          );
        result[key] = value === 'true';
        break;
      default:
        result[key] = value;
        break;
    }
  }

  return result;
}

export function createConnectionCommand(
  type: string,
  name: string,
  kvPairs: string[]
): void {
  const registeredTypes = getRegisteredConnectionTypes();
  if (!registeredTypes.includes(type))
    exitWithError(
      `Unknown connection type: ${type}. Available types: ${registeredTypes.join(
        ', '
      )}`
    );

  if (connectionEntryFromName(name))
    exitWithError(`A connection named ${name} already exists`);

  const parsed = parseKeyValuePairs(kvPairs, type);
  const entry: ConnectionConfigEntry = {is: type, ...parsed};

  config.connections[name] = entry;
  saveConfig();
  out(`Connection ${name} created`);
}

export function updateConnectionCommand(name: string, kvPairs: string[]): void {
  const entry = connectionEntryFromName(name);
  if (!entry) exitWithError(`A connection named ${name} could not be found`);

  const parsed = parseKeyValuePairs(kvPairs, entry.is);
  Object.assign(entry, parsed);

  saveConfig();
  out(`Connection ${name} updated`);
}

export function describeConnectionCommand(type?: string): void {
  const registeredTypes = getRegisteredConnectionTypes();

  if (!type) {
    out(
      `Available connection types: ${registeredTypes.join(
        ', '
      )}\n\nUse 'malloy connections describe <type>' to see properties.`
    );
    return;
  }

  if (!registeredTypes.includes(type))
    exitWithError(
      `Unknown connection type: ${type}. Available types: ${registeredTypes.join(
        ', '
      )}`
    );

  out(`Connection type: ${type}\n\n${formatPropertiesTable(type)}`);
}

export async function testConnectionCommand(name: string): Promise<void> {
  const entry = connectionEntryFromName(name);
  if (!entry) exitWithError(`A connection named ${name} could not be found`);

  const testConfig = {connections: {[name]: entry}};
  const lookup = createConnectionsFromConfig(testConfig);
  const connection = await lookup.lookupConnection(name);

  try {
    await (connection as TestableConnection).test();
    out('Connection test successful');
  } catch (e) {
    exitWithError(`Connection test unsuccessful: ${errorMessage(e)}`);
  }
}

export function showConnectionCommand(name: string): void {
  const entry = config.connections[name];
  if (!entry) exitWithError(`Could not find a connection named ${name}`);

  const props = getConnectionProperties(entry.is);
  const passwordFields = new Set(
    props?.filter(p => p.type === 'password').map(p => p.name) ?? []
  );

  const masked: Record<string, unknown> = {name};
  for (const [key, value] of Object.entries(entry)) {
    masked[key] = passwordFields.has(key) && value ? '****' : value;
  }

  out(JSON.stringify(masked, null, 4));
}

export function listConnectionsCommand(): void {
  const names = Object.keys(config.connections);
  if (names.length > 0) {
    for (const name of names) {
      out(`${name}:\n\ttype: ${config.connections[name].is}`);
    }
  } else {
    out('No connections found');
  }
}

export function removeConnectionCommand(name: string): void {
  if (config.connections[name]) {
    delete config.connections[name];
    saveConfig();
    out(`${name} removed from connections`);
  } else {
    exitWithError(`Could not find a connection named ${name}`);
  }
}
