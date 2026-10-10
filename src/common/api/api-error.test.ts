import { describe, expect, it } from 'vitest';

import { ApiError, GENERIC_ERROR_MESSAGE, normalizeApiError } from './api-error';

describe('normalizeApiError', () => {
  it('wraps unknown errors in a generic ApiError', () => {
    expect(normalizeApiError(new Error('boom'))).toMatchObject({
      message: GENERIC_ERROR_MESSAGE,
      status: null,
      code: null,
    });
  });

  it('returns an ApiError unchanged', () => {
    const error = new ApiError('Known', 500, 'X');
    expect(normalizeApiError(error)).toBe(error);
  });
});
