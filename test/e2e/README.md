## End-to-end tests

Tests in this folder can be run against a fully built CLI by spawning a process. This enables testing of things that happen during packaging/building.

Currently only runs against a built NPM package. Build the package with `npm run package-npm test` or run `npm run test-e2e` to build and run tests

Note that running these tests from VSCode will fail without additional setup of your jest extension. By default `npm run test` runs only jest.config.js
