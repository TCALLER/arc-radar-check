import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';

import { env } from '@/common/config/env';
import { API_TIMEOUT_MS } from '@/common/constants';

import { normalizeApiError, type ApiErrorBody } from './api-error';

const axiosInstance = axios.create({
  baseURL: env.NEXT_PUBLIC_API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  // fetch adapter: enforces the timeout consistently (browsers, jsdom tests and MSW).
  adapter: 'fetch',
  headers: { Accept: 'application/json' },
});

// No auth header: this app has no user session. Holder and payment checks are server-side.
axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => Promise.reject(normalizeApiError(error)),
);

export const requester = {
  get: <TResponse>(url: string, config?: AxiosRequestConfig) =>
    axiosInstance.get<TResponse>(url, config).then((res) => res.data),
};
