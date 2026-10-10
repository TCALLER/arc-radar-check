import { delay, http, HttpResponse } from 'msw';

import { env } from '@/common/config/env';
import { HTTP_STATUS } from '@/common/constants';

import checkError from '@samples/check-error.json';
import checkHostile from '@samples/check-hostile.json';
import checkOk from '@samples/check-ok.json';
import checkPaymentRequired from '@samples/check-payment-required.json';

import { ACCESS_ENDPOINT, CHECK_ENDPOINT } from './constants';
import { MOCK_ADDRESSES } from './mocks-addresses';

export { MOCK_ADDRESSES };

/*
 * The shared samples are served exactly as they are: no edits, overrides or
 * extra fixtures. Specific addresses pick a sample; the timeout case only delays.
 */

const NOT_FOUND_STATUS = 404;

/** Page URL parameter that sets the mocked holder answer: `?holder=true`. */
export const MOCK_HOLDER_PARAM = 'holder';

/**
 * Mock only: the wallet is a holder only when the page link has `?holder=true`. A plain link, or
 * any other value, answers not a holder, so both answers can be shown on one deployment.
 */
export const resolveMockHolder = (pageSearch: string): boolean =>
  new URLSearchParams(pageSearch).get(MOCK_HOLDER_PARAM) === 'true';

const readPageSearch = (): string => (typeof window === 'undefined' ? '' : window.location.search);

const apiUrl = (path: string): string => `${env.NEXT_PUBLIC_API_BASE_URL}${path}`;

export const tokenCheckHandlers = [
  http.get(apiUrl(CHECK_ENDPOINT), async ({ request }) => {
    const token = new URL(request.url).searchParams.get('token')?.toLowerCase();

    if (token === MOCK_ADDRESSES.timeout) {
      // Never answers: the requester's timeout ends the request.
      await delay('infinite');
    }
    // Realistic network delay in the browser, none in Node tests.
    await delay();

    switch (token) {
      case MOCK_ADDRESSES.ok:
        return HttpResponse.json(checkOk);
      case MOCK_ADDRESSES.hostile:
        return HttpResponse.json(checkHostile);
      case MOCK_ADDRESSES.paymentRequired:
        return HttpResponse.json(checkPaymentRequired, { status: HTTP_STATUS.PAYMENT_REQUIRED });
      default:
        return HttpResponse.json(checkError, { status: NOT_FOUND_STATUS });
    }
  }),

  // Holder only with `?holder=true` on the page URL.
  http.get(apiUrl(ACCESS_ENDPOINT), async () => {
    await delay();
    return HttpResponse.json({
      holder: resolveMockHolder(readPageSearch()),
    });
  }),
];
