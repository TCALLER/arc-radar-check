import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { ApiError, isInvalidResponseError } from '@/common/api/api-error';
import { requester } from '@/common/api/interceptor';
import { server } from '@/common/test/server';

import checkError from '@samples/check-error.json';
import checkHostile from '@samples/check-hostile.json';
import checkOk from '@samples/check-ok.json';
import checkPaymentRequired from '@samples/check-payment-required.json';

import { tokenCheckApi, tokenCheckKeys, tokenCheckQueries } from './api';
import { MOCK_ADDRESSES } from './mocks';
import { CheckStatus } from './schema';

import type * as Constants from '@/common/constants';

// A short timeout so the never-answering mock address fails fast in tests.
vi.mock('@/common/constants', async (importOriginal) => ({
  ...(await importOriginal<typeof Constants>()),
  API_TIMEOUT_MS: 50,
}));
vi.mock('@/common/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const API = 'https://api.test.local';
const OTHER_ADDRESS = '0x2222222222222222222222222222222222222222';

const getCheckError = (address: string): Promise<unknown> =>
  tokenCheckApi.getCheck(address).catch((error: unknown) => error);

describe('mocks serve the samples unchanged', () => {
  it.each([
    [MOCK_ADDRESSES.ok, checkOk],
    [MOCK_ADDRESSES.hostile, checkHostile],
  ])('%s returns its sample byte for byte', async (address, sample) => {
    await expect(requester.get('/v1/check', { params: { token: address } })).resolves.toEqual(
      sample,
    );
  });

  it('returns the 402 sample with HTTP 402', async () => {
    const error = await requester
      .get('/v1/check', { params: { token: MOCK_ADDRESSES.paymentRequired } })
      .catch((caught: unknown) => caught);
    expect(error).toMatchObject({ status: 402, body: checkPaymentRequired });
  });

  it('returns the error sample for any other address', async () => {
    const error = await requester
      .get('/v1/check', { params: { token: OTHER_ADDRESS } })
      .catch((caught: unknown) => caught);
    expect(error).toMatchObject({ status: 404, body: checkError });
  });
});

describe('tokenCheckApi.getCheck', () => {
  it('returns a parsed ok result', async () => {
    const result = await tokenCheckApi.getCheck(MOCK_ADDRESSES.ok);
    expect(result.status).toBe(CheckStatus.Ok);
  });

  it('matches mock addresses regardless of letter case', async () => {
    const result = await tokenCheckApi.getCheck(
      MOCK_ADDRESSES.hostile.toUpperCase().replace('0X', '0x'),
    );
    expect(result.status).toBe(CheckStatus.Ok);
  });

  it('returns payment_required for HTTP 402 instead of throwing', async () => {
    const result = await tokenCheckApi.getCheck(MOCK_ADDRESSES.paymentRequired);
    expect(result).toMatchObject({
      status: CheckStatus.PaymentRequired,
      payment: { price_usdc: '0.50' },
    });
  });

  it('returns the error response for an unknown token', async () => {
    const result = await tokenCheckApi.getCheck(OTHER_ADDRESS);
    expect(result).toMatchObject({ status: CheckStatus.Error, error: { code: 'TOKEN_NOT_FOUND' } });
  });

  it('flags a timeout', async () => {
    const error = await getCheckError(MOCK_ADDRESSES.timeout);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ isTimeout: true });
  });

  it('throws an invalid-response error when a 200 body does not match the schema', async () => {
    server.use(http.get(`${API}/v1/check`, () => HttpResponse.json({ status: 'ok', token: {} })));
    expect(isInvalidResponseError(await getCheckError(OTHER_ADDRESS))).toBe(true);
  });

  it('throws an invalid-response error when an error body does not match the schema', async () => {
    server.use(
      http.get(`${API}/v1/check`, () => HttpResponse.json({ oops: true }, { status: 500 })),
    );
    const error = await getCheckError(OTHER_ADDRESS);
    expect(isInvalidResponseError(error)).toBe(true);
    expect(error).toMatchObject({ status: 500 });
  });

  it('rethrows network errors', async () => {
    server.use(http.get(`${API}/v1/check`, () => HttpResponse.error()));
    const error = await getCheckError(OTHER_ADDRESS);
    expect(error).toMatchObject({ status: null, isTimeout: false });
    expect(isInvalidResponseError(error)).toBe(false);
  });
});

describe('tokenCheckApi.getAccess', () => {
  it('returns the mocked holder answer (not a holder without ?holder=true)', async () => {
    await expect(tokenCheckApi.getAccess(OTHER_ADDRESS)).resolves.toEqual({ holder: false });
  });

  it('answers from ?holder= on the page URL when it is set (mock only)', async () => {
    window.history.replaceState(null, '', '/?holder=true');
    try {
      await expect(tokenCheckApi.getAccess(OTHER_ADDRESS)).resolves.toEqual({ holder: true });
    } finally {
      window.history.replaceState(null, '', '/');
    }
  });

  it('sends the wallet address to the server', async () => {
    let requestedWallet: string | null = null;
    server.use(
      http.get(`${API}/v1/access`, ({ request }) => {
        requestedWallet = new URL(request.url).searchParams.get('wallet');
        return HttpResponse.json({ holder: true });
      }),
    );

    await expect(tokenCheckApi.getAccess(OTHER_ADDRESS)).resolves.toEqual({ holder: true });
    expect(requestedWallet).toBe(OTHER_ADDRESS);
  });

  it('rejects an invalid access response', async () => {
    server.use(http.get(`${API}/v1/access`, () => HttpResponse.json({ holder: 'yes' })));
    const error = await tokenCheckApi.getAccess(OTHER_ADDRESS).catch((caught: unknown) => caught);
    expect(isInvalidResponseError(error)).toBe(true);
  });
});

describe('query options', () => {
  it('skips the check without an address and the access call without a wallet', () => {
    expect(typeof tokenCheckQueries.check(null).queryFn).not.toBe('function');
    expect(typeof tokenCheckQueries.access(null).queryFn).not.toBe('function');
    expect(typeof tokenCheckQueries.access(OTHER_ADDRESS).queryFn).toBe('function');
  });

  it('keys queries case-insensitively', () => {
    expect(tokenCheckKeys.check('0xABab')).toEqual(tokenCheckKeys.check('0xabAB'));
    expect(tokenCheckKeys.access('0xABab')).toEqual(['access', '0xabab']);
  });
});
