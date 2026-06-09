'use strict';

const gtsConfig = require('gts/build/eslint.config');
const {defineConfig} = require('eslint/config');
const globals = require('globals');

module.exports = defineConfig([
  {
    ignores: [
      '**/*.d.ts',
      'node_modules/**',
      'dist/**',
      'pkg/**',
      'test/.build/**',
    ],
  },
  ...gtsConfig,
  {
    rules: {
      'no-console': ['error', {allow: ['debug', 'info', 'warn', 'error']}],
      'prettier/prettier': 'error',
      'no-duplicate-imports': 'error',
      'no-restricted-imports': ['error'],
      'no-throw-literal': 'error',
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        project: null,
      },
    },
    rules: {
      'no-undef': 'off',
      'no-duplicate-imports': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {prefer: 'no-type-imports'},
      ],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'none',
        },
      ],
      '@typescript-eslint/parameter-properties': [
        'warn',
        {prefer: 'parameter-property'},
      ],
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },
  {
    files: ['**/*.js', '**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: globals.node,
    },
  },
  {
    files: ['scripts/**', 'test/**'],
    rules: {
      'n/no-unpublished-import': 'off',
      'no-console': 'off',
      'no-process-exit': 'off',
    },
  },
  {
    files: ['src/**'],
    rules: {
      'no-process-exit': 'off',
    },
  },
]);
