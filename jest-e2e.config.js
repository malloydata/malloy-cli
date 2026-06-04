/*
 * Copyright Contributors to the Malloy project
 * SPDX-License-Identifier: MIT
 */

module.exports = {
  moduleFileExtensions: ['js', 'ts'],
  testMatch: ['<rootDir>/test/e2e/**/?(*.)spec.(ts|js)?(x)'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/pkg/'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {tsconfig: '<rootDir>/tsconfig.json'}],
  },
  testEnvironment: 'node',
};
