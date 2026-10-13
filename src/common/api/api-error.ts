import { isAxiosError, type AxiosError } from 'axios';

export type ApiErrorBody = { message?: string; code?: string };

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly code: string | null,
    readonly isTimeout = false,
    /** Raw response body, kept so callers can parse domain responses such as HTTP 402. */
    readonly body: unknown = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';
const TIMEOUT_ERROR_CODES = new Set(['ECONNABORTED', 'ETIMEDOUT']);

const readString = (body: unknown, key: keyof ApiErrorBody): string | null => {
  if (typeof body !== 'object' || body === null || !(key in body)) return null;
  const value: unknown = Reflect.get(body, key);
  return typeof value === 'string' ? value : null;
};

export const normalizeApiError = (error: AxiosError<ApiErrorBody> | unknown): ApiError => {
  if (error instanceof ApiError) return error;
  if (!isAxiosError(error)) {
    return new ApiError(GENERIC_ERROR_MESSAGE, null, null);
  }
  const body: unknown = error.response?.data ?? null;
  return new ApiError(
    readString(body, 'message') ?? GENERIC_ERROR_MESSAGE,
    error.response?.status ?? null,
    readString(body, 'code'),
    TIMEOUT_ERROR_CODES.has(error.code ?? ''),
    body,
  );
};

export const INVALID_RESPONSE_CODE = 'INVALID_RESPONSE';

/** A response that doesn't match the expected schema. Shown as a generic error. */
export const createInvalidResponseError = (status: number | null = null): ApiError =>
  new ApiError(GENERIC_ERROR_MESSAGE, status, INVALID_RESPONSE_CODE);

export const isInvalidResponseError = (error: unknown): boolean =>
  error instanceof ApiError && error.code === INVALID_RESPONSE_CODE;
