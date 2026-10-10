import { describe, expect, it } from 'vitest';

import { ApiError } from './api-error';
import { getQueryClient, shouldRetry } from './query-client';

describe('shouldRetry', () => {
  it('does not retry client errors, including 402 payment required', () => {
    expect(shouldRetry(0, new ApiError('Payment required', 402, null))).toBe(false);
    expect(shouldRetry(0, new ApiError('Not found', 404, null))).toBe(false);
  });

  it('does not retry timeouts', () => {
    expect(shouldRetry(0, new ApiError('Timeout', null, null, true))).toBe(false);
  });

  it('retries server and network errors at most twice', () => {
    const serverError = new ApiError('Server error', 500, null);
    expect(shouldRetry(0, serverError)).toBe(true);
    expect(shouldRetry(1, new ApiError('Network', null, null))).toBe(true);
    expect(shouldRetry(2, serverError)).toBe(false);
  });
});

describe('getQueryClient', () => {
  it('fails offline requests instead of pausing them, and does not refetch on reconnect', () => {
    const { queries } = getQueryClient().getDefaultOptions();
    expect(queries?.networkMode).toBe('always');
    expect(queries?.refetchOnReconnect).toBe(false);
  });

  it('reuses one client in the browser', () => {
    expect(getQueryClient()).toBe(getQueryClient());
  });
});
