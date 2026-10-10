import { queryOptions, skipToken } from '@tanstack/react-query';

import { ApiError, createInvalidResponseError } from '@/common/api/api-error';
import { requester } from '@/common/api/interceptor';
import { logger } from '@/common/utils/logger';

import { ACCESS_ENDPOINT, CHECK_ENDPOINT } from './constants';
import {
  AccessResponseSchema,
  CheckResponseSchema,
  type AccessResponse,
  type CheckResponse,
} from './schema';

import type { z } from 'zod';

const parseOrThrow = <TSchema extends z.ZodType>(
  schema: TSchema,
  data: unknown,
  context: string,
  status: number | null = null,
): z.infer<TSchema> => {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    logger.error(`${context}: response did not match the schema`, parsed.error.issues);
    throw createInvalidResponseError(status);
  }
  return parsed.data;
};

export const tokenCheckKeys = {
  all: ['token-check'] as const,
  check: (address: string) => [...tokenCheckKeys.all, 'check', address.toLowerCase()] as const,
  access: (wallet: string) => ['access', wallet.toLowerCase()] as const,
};

export const tokenCheckApi = {
  /**
   * GET {API}/v1/check?token=0x…
   * HTTP 402 and error statuses carry a check response in their body (`payment_required` /
   * `error`), so those are parsed and returned rather than thrown.
   */
  getCheck: async (address: string): Promise<CheckResponse> => {
    try {
      const data = await requester.get<unknown>(CHECK_ENDPOINT, { params: { token: address } });
      return parseOrThrow(CheckResponseSchema, data, 'Check');
    } catch (error) {
      if (error instanceof ApiError && error.status !== null && error.body !== null) {
        return parseOrThrow(CheckResponseSchema, error.body, 'Check', error.status);
      }
      throw error;
    }
  },

  /** GET {API}/v1/access?wallet=0x… → { holder }. The server alone decides access. */
  getAccess: async (wallet: string): Promise<AccessResponse> =>
    parseOrThrow(
      AccessResponseSchema,
      await requester.get<unknown>(ACCESS_ENDPOINT, { params: { wallet } }),
      'Access',
    ),
};

export const tokenCheckQueries = {
  /** Runs only once a valid address has been submitted. */
  check: (address: string | null) =>
    queryOptions({
      queryKey: tokenCheckKeys.check(address ?? ''),
      queryFn: address ? () => tokenCheckApi.getCheck(address) : skipToken,
    }),

  /** Runs only with a connected wallet: no wallet, no call. */
  access: (wallet: string | null) =>
    queryOptions({
      queryKey: tokenCheckKeys.access(wallet ?? ''),
      queryFn: wallet ? () => tokenCheckApi.getAccess(wallet) : skipToken,
    }),
};
