import { describe, expect, it } from 'vitest';

import { parseClientEnv } from './env';

const validEnv = {
  NEXT_PUBLIC_API_BASE_URL: 'https://api.test.local',
  NEXT_PUBLIC_API_MOCKING: 'enabled',
  NEXT_PUBLIC_AUTH_MOCKING: 'disabled',
  NEXT_PUBLIC_ARC_RPC_URL: 'https://rpc.test.local',
};

describe('parseClientEnv', () => {
  it('parses a valid environment', () => {
    expect(parseClientEnv(validEnv)).toEqual(validEnv);
  });

  it('defaults the flags', () => {
    const env = parseClientEnv({
      NEXT_PUBLIC_API_BASE_URL: validEnv.NEXT_PUBLIC_API_BASE_URL,
      NEXT_PUBLIC_ARC_RPC_URL: validEnv.NEXT_PUBLIC_ARC_RPC_URL,
    });
    expect(env.NEXT_PUBLIC_API_MOCKING).toBe('disabled');
    expect(env.NEXT_PUBLIC_AUTH_MOCKING).toBe('disabled');
    expect(env.NEXT_PUBLIC_CHECK_PRICE_USDC).toBeUndefined();
  });

  it('reads an optional locked-report price and treats an empty one as unset', () => {
    expect(parseClientEnv({ ...validEnv, NEXT_PUBLIC_CHECK_PRICE_USDC: '0.50' })).toMatchObject({
      NEXT_PUBLIC_CHECK_PRICE_USDC: '0.50',
    });
    expect(
      parseClientEnv({ ...validEnv, NEXT_PUBLIC_CHECK_PRICE_USDC: '' })
        .NEXT_PUBLIC_CHECK_PRICE_USDC,
    ).toBeUndefined();
    expect(() => parseClientEnv({ ...validEnv, NEXT_PUBLIC_CHECK_PRICE_USDC: '$0.50' })).toThrow(
      /NEXT_PUBLIC_CHECK_PRICE_USDC/,
    );
  });

  it('fails without an RPC URL instead of falling back', () => {
    expect(() => parseClientEnv({ ...validEnv, NEXT_PUBLIC_ARC_RPC_URL: undefined })).toThrow(
      /NEXT_PUBLIC_ARC_RPC_URL/,
    );
  });

  it('rejects an invalid API URL and unknown flag values', () => {
    expect(() => parseClientEnv({ ...validEnv, NEXT_PUBLIC_API_BASE_URL: 'not a url' })).toThrow();
    expect(() => parseClientEnv({ ...validEnv, NEXT_PUBLIC_API_MOCKING: 'yes' })).toThrow();
  });
});
