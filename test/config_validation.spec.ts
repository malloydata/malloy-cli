/* Copyright Contributors to the Malloy project / SPDX-License-Identifier: MIT */

import {MalloyConfig} from '@malloydata/malloy';
import '@malloydata/malloy-connections';

function validateConfig(data: Record<string, unknown>) {
  const config = new MalloyConfig(JSON.stringify(data));
  return config.log;
}

describe('config validation', () => {
  it('accepts a valid config', () => {
    const log = validateConfig({
      connections: {
        mydb: {is: 'duckdb'},
      },
    });
    expect(log).toEqual([]);
  });

  it('warns on unknown top-level keys', () => {
    const log = validateConfig({
      connections: {},
      notAKey: 'hello',
    });
    expect(log).toHaveLength(1);
    expect(log[0].message).toContain('notAKey');
  });

  it('warns on unknown connection type', () => {
    const log = validateConfig({
      connections: {
        mydb: {is: 'faketype'},
      },
    });
    expect(log).toHaveLength(1);
    expect(log[0].message).toContain('unknown connection type');
  });

  it('warns on missing "is" field', () => {
    const log = validateConfig({
      connections: {
        mydb: {},
      },
    });
    expect(log).toHaveLength(1);
    expect(log[0].message).toContain('missing required "is"');
  });

  it('warns on unknown property for a connection type', () => {
    const log = validateConfig({
      connections: {
        mydb: {is: 'duckdb', notARealProp: 'value'},
      },
    });
    expect(log).toHaveLength(1);
    expect(log[0].message).toContain('unknown property');
  });

  it('suggests closest match for misspelled property', () => {
    const log = validateConfig({
      connections: {
        mydb: {is: 'duckdb', databsePath: '/tmp/test.db'},
      },
    });
    expect(log).toHaveLength(1);
    expect(log[0].message).toContain('Did you mean "databasePath"');
  });

  it('suggests closest match for misspelled connection type', () => {
    const log = validateConfig({
      connections: {
        mydb: {is: 'duckbd'},
      },
    });
    expect(log).toHaveLength(1);
    expect(log[0].message).toContain('Did you mean "duckdb"');
  });

  it('suggests closest match for misspelled top-level key', () => {
    const log = validateConfig({
      conections: {},
    });
    expect(log).toHaveLength(1);
    expect(log[0].message).toContain('Did you mean "connections"');
  });

  it('warns on wrong value type', () => {
    const log = validateConfig({
      connections: {
        mydb: {is: 'duckdb', databasePath: 123},
      },
    });
    expect(log).toHaveLength(1);
    expect(log[0].message).toContain('should be a string');
  });

  it('accepts env var references when variable is set', () => {
    process.env['TEST_VALIDATE_DB_PATH'] = '/tmp/test.db';
    try {
      const log = validateConfig({
        connections: {
          mydb: {is: 'duckdb', databasePath: {env: 'TEST_VALIDATE_DB_PATH'}},
        },
      });
      expect(log).toEqual([]);
    } finally {
      delete process.env['TEST_VALIDATE_DB_PATH'];
    }
  });

  it('silently drops unset env var references', () => {
    // The new MalloyConfig design (0.0.373) silently drops references to
    // known overlays that return undefined — matching the behavior of unset
    // env vars in the old codebase. If the dropped property was required,
    // the connection factory will complain at lookup time, not config time.
    delete process.env['DEFINITELY_NOT_SET_12345'];
    const log = validateConfig({
      connections: {
        mydb: {is: 'duckdb', databasePath: {env: 'DEFINITELY_NOT_SET_12345'}},
      },
    });
    expect(log).toEqual([]);
  });

  it('accepts valid manifestPath', () => {
    const log = validateConfig({
      manifestPath: 'custom/path',
    });
    expect(log).toEqual([]);
  });

  it('returns no warnings for empty config', () => {
    const log = validateConfig({});
    expect(log).toEqual([]);
  });

  it('accepts virtualMap as a valid top-level key', () => {
    const log = validateConfig({
      virtualMap: {someFile: 'someContent'},
    });
    expect(log).toEqual([]);
  });

  it('warns when connections is a falsy non-undefined value', () => {
    const log = validateConfig({connections: ''});
    expect(log).toHaveLength(1);
    expect(log[0].message).toContain('should be an object');
  });

  it('does not treat objects with extra keys as env refs', () => {
    const log = validateConfig({
      connections: {
        mydb: {is: 'duckdb', databasePath: {env: 'X', extra: true}},
      },
    });
    expect(log).toHaveLength(1);
    expect(log[0].message).toContain('should be a string');
  });

  it('does not warn about env refs on json-type properties', () => {
    const log = validateConfig({
      connections: {
        mydb: {is: 'trino', ssl: {env: 'UNSET_ENV_FOR_TEST'}},
      },
    });
    const sslWarnings = log.filter(w => w.message.includes('.ssl'));
    expect(sslWarnings).toEqual([]);
  });
});
