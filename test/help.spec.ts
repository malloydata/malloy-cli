/*
 * Copyright Contributors to the Malloy project
 * SPDX-License-Identifier: MIT
 */

import {createCLI} from '../src/cli';

describe('runs CLI help', () => {
  const cli = createCLI();
  it('has help', () => {
    const writeMock = jest.fn();
    cli.exitOverride().configureOutput({writeOut: writeMock});

    expect(() => {
      cli.parse(['--help'], {from: 'user'});
    }).toThrow('(outputHelp)');
    expect(() => {
      cli.parse(['--help'], {from: 'user'});
    }).toThrow('(outputHelp)');
  });
});
