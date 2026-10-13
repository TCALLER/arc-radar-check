import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '@/common/test/server';

import { ApiError, GENERIC_ERROR_MESSAGE } from './api-error';
import { requester } from './interceptor';

const API = 'https://api.test.local';

describe('requester', () => {
  it('returns the response body for a successful request', async () => {
    server.use(http.get(`${API}/ping`, () => HttpResponse.json({ pong: true })));
    await expect(requester.get('/ping')).resolves.toEqual({ pong: true });
  });

  it('normalizes an HTTP error into ApiError and keeps the body', async () => {
    const body = { status: 'payment_required', code: 'PAY' };
    server.use(http.get(`${API}/paid`, () => HttpResponse.json(body, { status: 402 })));

    const error: unknown = await requester.get('/paid').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 402,
      code: 'PAY',
      message: GENERIC_ERROR_MESSAGE,
      isTimeout: false,
      body,
    });
  });

  it('normalizes a network failure into ApiError without a status', async () => {
    server.use(http.get(`${API}/down`, () => HttpResponse.error()));

    const error: unknown = await requester.get('/down').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: null, isTimeout: false });
  });

  it('flags a timeout', async () => {
    server.use(
      http.get(`${API}/slow`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return HttpResponse.json({});
      }),
    );

    const error: unknown = await requester
      .get('/slow', { timeout: 20 })
      .catch((caught: unknown) => caught);

    expect(error).toMatchObject({ isTimeout: true });
  });
});
