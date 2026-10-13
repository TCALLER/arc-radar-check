'use client';

import { useEffect, useState } from 'react';

import { env } from '@/common/config/env';
import { logger } from '@/common/utils/logger';

import type { ReactNode } from 'react';

const isMockingEnabled = env.NEXT_PUBLIC_API_MOCKING === 'enabled';
const START_OPTIONS = { onUnhandledRequest: 'bypass', quiet: true } as const;

const loadWorker = () => import('@/mocks/browser').then(({ worker }) => worker);

// Started once per page load: effects can run twice in development (Strict Mode).
let workerReady: Promise<unknown> | null = null;

const startWorker = (): Promise<unknown> => {
  workerReady ??= loadWorker().then((worker) => worker.start(START_OPTIONS));
  return workerReady;
};

// MSW's own message (see public/mockServiceWorker.js) that adds this page to the worker's list.
const MOCK_ACTIVATE_MESSAGE = 'MOCK_ACTIVATE';

/**
 * Phones stop an idle service worker while the page is in the background (e.g. while the user
 * confirms in the wallet app). The restarted MSW worker no longer knows this page and lets every
 * request through to the real network. Re-sending MSW's activation message when the page is shown
 * again adds the page back (repeating it is harmless) and wakes the worker. Unlike stop() + start(),
 * mocking never switches off, so a request sent at that moment is not let through.
 */
const reactivateWorker = (): void => {
  navigator.serviceWorker?.controller?.postMessage(MOCK_ACTIVATE_MESSAGE);
};

/** Starts MSW before any request when mocking is on. The dynamic import keeps MSW out of production bundles. */
export function MockProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(!isMockingEnabled);

  useEffect(() => {
    if (!isMockingEnabled) return;
    startWorker()
      .then(() => setIsReady(true))
      .catch((error: unknown) => logger.error('Mock service worker failed to start', error));

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      reactivateWorker();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return isReady ? children : null;
}
