/* Copyright Contributors to the Malloy project / SPDX-License-Identifier: MIT */

import {
  getConnectionProperties,
  getRegisteredConnectionTypes,
} from '@malloydata/malloy';

// Import for side-effect of registering all connection types
import '@malloydata/malloy-connections';

const KNOWN_TOP_LEVEL_KEYS = new Set([
  'connections',
  'manifestPath',
  'virtualMap',
]);

export interface ConfigWarning {
  path: string;
  message: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Match runtime ValueRef semantics: strict {env: "VAR"} with no extra keys.
 */
function isValueRef(value: unknown): value is {env: string} {
  return (
    isRecord(value) &&
    typeof value.env === 'string' &&
    Object.keys(value).length === 1
  );
}

/**
 * Validate a parsed config against the connection type registry.
 * Returns warnings — does not throw.
 */
export function validateConfig(data: Record<string, unknown>): ConfigWarning[] {
  const warnings: ConfigWarning[] = [];

  // Check top-level keys
  for (const key of Object.keys(data)) {
    if (!KNOWN_TOP_LEVEL_KEYS.has(key)) {
      const suggestion = closestMatch(key, [...KNOWN_TOP_LEVEL_KEYS]);
      const hint = suggestion ? `. Did you mean "${suggestion}"?` : '';
      warnings.push({
        path: key,
        message: `unknown config key "${key}"${hint}`,
      });
    }
  }

  // Validate manifestPath type
  if (
    data.manifestPath !== undefined &&
    typeof data.manifestPath !== 'string'
  ) {
    warnings.push({
      path: 'manifestPath',
      message: '"manifestPath" should be a string',
    });
  }

  const connections = data.connections;
  if (connections === undefined) return warnings;

  if (!isRecord(connections)) {
    warnings.push({
      path: 'connections',
      message: '"connections" should be an object',
    });
    return warnings;
  }

  const registeredTypes = new Set(getRegisteredConnectionTypes());

  for (const [name, rawEntry] of Object.entries(connections)) {
    const prefix = `connections.${name}`;

    if (!isRecord(rawEntry)) {
      warnings.push({path: prefix, message: 'should be an object'});
      continue;
    }

    if (!rawEntry.is) {
      warnings.push({
        path: prefix,
        message: 'missing required "is" field (connection type)',
      });
      continue;
    }

    if (typeof rawEntry.is !== 'string') {
      warnings.push({
        path: `${prefix}.is`,
        message: '"is" should be a string',
      });
      continue;
    }

    if (!registeredTypes.has(rawEntry.is)) {
      const suggestion = closestMatch(rawEntry.is, [...registeredTypes]);
      const hint = suggestion ? ` Did you mean "${suggestion}"?` : '';
      warnings.push({
        path: `${prefix}.is`,
        message: `unknown connection type "${
          rawEntry.is
        }".${hint} Available types: ${[...registeredTypes].join(', ')}`,
      });
      continue;
    }

    const props = getConnectionProperties(rawEntry.is);
    if (!props) continue;

    const knownProps = new Map(props.map(p => [p.name, p]));

    for (const [key, value] of Object.entries(rawEntry)) {
      if (key === 'is') continue;

      const propDef = knownProps.get(key);
      if (!propDef) {
        const suggestion = closestMatch(key, [...knownProps.keys()]);
        const hint = suggestion ? `. Did you mean "${suggestion}"?` : '';
        warnings.push({
          path: `${prefix}.${key}`,
          message: `unknown property "${key}" for connection type "${rawEntry.is}"${hint}`,
        });
        continue;
      }

      // For env var references on non-json props, check the variable exists.
      // JSON props accept any value, so objects are valid — not env refs.
      if (propDef.type !== 'json' && isValueRef(value)) {
        if (process.env[value.env] === undefined) {
          warnings.push({
            path: `${prefix}.${key}`,
            message: `environment variable "${value.env}" is not set`,
          });
        }
        continue;
      }

      // Check value type against property definition
      const typeError = checkValueType(value, propDef.type);
      if (typeError) {
        warnings.push({
          path: `${prefix}.${key}`,
          message: `${typeError} (expected ${propDef.type})`,
        });
      }
    }
  }

  return warnings;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({length: m + 1}, () =>
    Array(n + 1).fill(0)
  );
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

function closestMatch(input: string, candidates: string[]): string | undefined {
  if (candidates.length === 0) return undefined;
  let best = candidates[0];
  let bestDist = Infinity;
  for (const c of candidates) {
    const dist = levenshtein(input.toLowerCase(), c.toLowerCase());
    if (dist < bestDist) {
      bestDist = dist;
      best = c;
    }
  }
  // Only suggest if the edit distance is reasonable relative to the word length
  const maxDist = Math.max(
    1,
    Math.floor(Math.max(input.length, best.length) / 3)
  );
  return bestDist <= maxDist ? best : undefined;
}

function checkValueType(
  value: unknown,
  expectedType: string
): string | undefined {
  if (value === undefined || value === null) return undefined;

  switch (expectedType) {
    case 'number':
      if (typeof value !== 'number')
        return `should be a number, got ${typeof value}`;
      break;
    case 'boolean':
      if (typeof value !== 'boolean')
        return `should be a boolean, got ${typeof value}`;
      break;
    case 'string':
    case 'password':
    case 'secret':
    case 'file':
    case 'text':
      if (typeof value !== 'string')
        return `should be a string, got ${typeof value}`;
      break;
    case 'json':
      // json accepts any JSON-compatible value
      break;
  }

  return undefined;
}
