/* Copyright Contributors to the Malloy project / SPDX-License-Identifier: MIT */

import {withDuckdbLockRetry} from '../src/util';

jest.mock('../src/config', () => ({
  malloyConfig: {
    shutdown: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('withDuckdbLockRetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns immediately on success without retrying', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    await expect(withDuckdbLockRetry(fn)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('rethrows non-lock errors without retrying', async () => {
    const err = new Error('connection refused: not a lock issue');
    const fn = jest.fn().mockRejectedValue(err);
    await expect(withDuckdbLockRetry(fn)).rejects.toBe(err);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on DuckDB lock error and recovers', async () => {
    const lockErr = new Error(
      'IO Error: Could not set lock on file "foo.duckdb"'
    );
    const fn = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce(lockErr)
      .mockResolvedValue('recovered');

    const promise = withDuckdbLockRetry(fn);
    // Drain microtasks for the failed attempt + lazy-import + shutdown call,
    // then advance past the first backoff (100ms) so the retry fires.
    await jest.advanceTimersByTimeAsync(150);
    await expect(promise).resolves.toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('exhausts retries and throws a friendly wrapped error', async () => {
    const lockErr = new Error(
      'IO Error: Could not set lock on file "foo.duckdb"'
    );
    const fn = jest.fn().mockRejectedValue(lockErr);

    const promise = withDuckdbLockRetry(fn);
    promise.catch(() => {}); // pre-attach to avoid unhandled-rejection noise

    // Advance past every backoff: 100 + 200 + 400 + 800 + 1500 = 3000ms,
    // plus a bit of slack for microtasks between retries.
    await jest.advanceTimersByTimeAsync(3500);
    await expect(promise).rejects.toMatchObject({
      message: expect.stringMatching(/held by another process/),
    });
    // 5 retries with delays + 1 final attempt = 6 calls.
    expect(fn).toHaveBeenCalledTimes(6);
  });

  it('preserves the original error message in the wrapped message', async () => {
    const lockErr = new Error(
      'IO Error: Could not set lock on file "/tmp/x.duckdb"'
    );
    const fn = jest.fn().mockRejectedValue(lockErr);
    const promise = withDuckdbLockRetry(fn);
    promise.catch(() => {});
    await jest.advanceTimersByTimeAsync(3500);
    await expect(promise).rejects.toMatchObject({
      message: expect.stringContaining('Could not set lock on file'),
    });
  });
});
