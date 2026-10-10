import { isServer, QueryClient } from '@tanstack/react-query';

import { HTTP_STATUS } from '@/common/constants';

import { ApiError } from './api-error';

const DEFAULT_STALE_TIME_MS = 60_000;
const MAX_QUERY_RETRIES = 2;

/** Never retry client errors (4xx, including 402) or timeouts; retry network errors and 5xx. */
export const shouldRetry = (failureCount: number, error: unknown): boolean => {
  if (error instanceof ApiError) {
    if (error.isTimeout) return false;
    if (error.status !== null && error.status < HTTP_STATUS.INTERNAL_SERVER_ERROR) return false;
  }
  return failureCount < MAX_QUERY_RETRIES;
};

const makeQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: DEFAULT_STALE_TIME_MS,
        retry: shouldRetry,
        refetchOnWindowFocus: false,
        // A check or holder answer is a one-off result: coming back online (e.g. after the
        // wallet app) must not turn it back into a loading state.
        refetchOnReconnect: false,
        // Offline requests fail and show an error instead of pausing (an endless loading state).
        networkMode: 'always',
      },
      mutations: { retry: false },
    },
  });

let browserQueryClient: QueryClient | undefined;

export const getQueryClient = (): QueryClient => {
  if (isServer) return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
};
