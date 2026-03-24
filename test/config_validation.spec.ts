/* Copyright Contributors to the Malloy project / SPDX-License-Identifier: MIT */

import {validateConfig} from '../src/config_validation';

describe('config validation', () => {
  it('accepts a valid config', () => {
    const warnings = validateConfig({
      connections: {
        mydb: {is: 'duckdb'},
      },
    });
    expect(warnings).toEqual([]);
  });

  it('warns on unknown top-level keys', () => {
    const warnings = validateConfig({
      connections: {},
      notAKey: 'hello',
    });
    expect(warnings).toHaveLength(1);
    expect(warnings[0].path).toBe('notAKey');
    expect(warnings[0].message).toContain('unknown config key');
  });

  it('warns on unknown connection type', () => {
    const warnings = validateConfig({
      connections: {
        mydb: {is: 'faketype'},
      },
    });
    expect(warnings).toHaveLength(1);
    expect(warnings[0].path).toBe('connections.mydb.is');
    expect(warnings[0].message).toContain('unknown connection type');
  });

  it('warns on missing "is" field', () => {
    const warnings = validateConfig({
      connections: {
        mydb: {},
      },
    });
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toContain('missing required "is"');
  });

  it('warns on unknown property for a connection type', () => {
    const warnings = validateConfig({
      connections: {
        mydb: {is: 'duckdb', notARealProp: 'value'},
      },
    });
    expect(warnings).toHaveLength(1);
    expect(warnings[0].path).toBe('connections.mydb.notARealProp');
    expect(warnings[0].message).toContain('unknown property');
  });

  it('suggests closest match for misspelled property', () => {
    const warnings = validateConfig({
      connections: {
        mydb: {is: 'duckdb', databsePath: '/tmp/test.db'},
      },
    });
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toContain('Did you mean "databasePath"');
  });

  it('suggests closest match for misspelled connection type', () => {
    const warnings = validateConfig({
      connections: {
        mydb: {is: 'duckbd'},
      },
    });
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toContain('Did you mean "duckdb"');
  });

  it('suggests closest match for misspelled top-level key', () => {
    const warnings = validateConfig({
      conections: {},
    });
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toContain('Did you mean "connections"');
  });

  it('warns on wrong value type', () => {
    const warnings = validateConfig({
      connections: {
        mydb: {is: 'duckdb', databasePath: 123},
      },
    });
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toContain('should be a string');
  });

  it('accepts env var references when variable is set', () => {
    process.env['TEST_VALIDATE_DB_PATH'] = '/tmp/test.db';
    try {
      const warnings = validateConfig({
        connections: {
          mydb: {is: 'duckdb', databasePath: {env: 'TEST_VALIDATE_DB_PATH'}},
        },
      });
      expect(warnings).toEqual([]);
    } finally {
      delete process.env['TEST_VALIDATE_DB_PATH'];
    }
  });

  it('warns when env var reference points to unset variable', () => {
    delete process.env['DEFINITELY_NOT_SET_12345'];
    const warnings = validateConfig({
      connections: {
        mydb: {is: 'duckdb', databasePath: {env: 'DEFINITELY_NOT_SET_12345'}},
      },
    });
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toContain('DEFINITELY_NOT_SET_12345');
    expect(warnings[0].message).toContain('not set');
  });

  it('accepts valid manifestPath', () => {
    const warnings = validateConfig({
      manifestPath: 'custom/path',
    });
    expect(warnings).toEqual([]);
  });

  it('returns no warnings for empty config', () => {
    const warnings = validateConfig({});
    expect(warnings).toEqual([]);
  });

  it('accepts virtualMap as a valid top-level key', () => {
    const warnings = validateConfig({
      virtualMap: {someFile: 'someContent'},
    });
    expect(warnings).toEqual([]);
  });

  it('warns when connections is a falsy non-undefined value', () => {
    const warnings = validateConfig({connections: ''});
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toContain('should be an object');
  });

  it('does not treat objects with extra keys as env refs', () => {
    const warnings = validateConfig({
      connections: {
        mydb: {is: 'duckdb', databasePath: {env: 'X', extra: true}},
      },
    });
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toContain('should be a string');
  });

  it('does not warn about env refs on json-type properties', () => {
    const warnings = validateConfig({
      connections: {
        mydb: {is: 'trino', ssl: {env: 'UNSET_ENV_FOR_TEST'}},
      },
    });
    const sslWarnings = warnings.filter(w => w.path.endsWith('.ssl'));
    expect(sslWarnings).toEqual([]);
  });
});
