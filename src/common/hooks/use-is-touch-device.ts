'use client';

import { useSyncExternalStore } from 'react';

const COARSE_POINTER_QUERY = '(pointer: coarse)';

const getMedia = (): MediaQueryList | null =>
  typeof window.matchMedia === 'function' ? window.matchMedia(COARSE_POINTER_QUERY) : null;

const subscribe = (onChange: () => void) => {
  const media = getMedia();
  media?.addEventListener('change', onChange);
  return () => media?.removeEventListener('change', onChange);
};

/** True on phones and tablets (coarse pointer). False on the server or without matchMedia. */
export const useIsTouchDevice = (): boolean =>
  useSyncExternalStore(
    subscribe,
    () => getMedia()?.matches ?? false,
    () => false,
  );
