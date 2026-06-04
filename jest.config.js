/*
 * Copyright Contributors to the Malloy project
 * SPDX-License-Identifier: MIT
 */

module.exports = {
  moduleFileExtensions: ['js', 'ts'],
  testMatch: ['**/?(*.)spec.(ts|js)?(x)'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/pkg/', '/test/e2e/'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {tsconfig: '<rootDir>/tsconfig.json'}],
  },
  testEnvironment: 'node',
};
