'use client';

import { useEffect, useSyncExternalStore } from 'react';

import {
  clearTelegramLaunchHash,
  getTelegramWebApp,
  isMarkedTelegram,
  TELEGRAM_SDK_READY_EVENT,
  waitForTelegramSdk,
} from '@/common/utils/global-utility';

const COLOR_SCHEME_ATTRIBUTE = 'data-color-scheme';

// Usually the SDK is ready before the app starts; when it is late, waitForTelegramSdk says so.
const subscribe = (onChange: () => void) => {
  window.addEventListener(TELEGRAM_SDK_READY_EVENT, onChange);
  return () => window.removeEventListener(TELEGRAM_SDK_READY_EVENT, onChange);
};

const useHasTelegramSdk = (): boolean =>
  useSyncExternalStore(
    subscribe,
    () => getTelegramWebApp() !== null,
    () => false,
  );

/**
 * True inside the Telegram Mini App: the SDK has init data, or the early script recognised it
 * while the SDK is still on its way (so the browser-only UI never shows there).
 */
export const useIsTelegram = (): boolean =>
  useSyncExternalStore(
    subscribe,
    () => getTelegramWebApp() !== null || isMarkedTelegram(),
    () => false,
  );

/**
 * Outside Telegram, clears Telegram's launch data from the address bar. Inside Telegram, tells
 * the SDK the page is ready (when it arrives) and mirrors Telegram's light/dark scheme onto <html>
 * so the night colours apply. The telegram theme itself is forced by ThemeProvider, never
 * saved, so it can't leak into a browser that shares storage with Telegram. Outside Telegram it
 * does nothing.
 */
export const useTelegramTheme = (): { isTelegram: boolean } => {
  const isTelegram = useIsTelegram();
  const hasSdk = useHasTelegramSdk();

  useEffect(() => {
    const webApp = getTelegramWebApp();
    if (!webApp) {
      // Inside the Mini App with a late SDK: wait for it (this effect runs again when it's there).
      waitForTelegramSdk();
      // A browser opened from the Mini App: drop Telegram's launch data from the address bar.
      clearTelegramLaunchHash();
      return;
    }

    const syncColorScheme = () =>
      document.documentElement.setAttribute(COLOR_SCHEME_ATTRIBUTE, webApp.colorScheme);

    webApp.ready();
    webApp.expand();
    syncColorScheme();
    webApp.onEvent('themeChanged', syncColorScheme);

    return () => webApp.offEvent('themeChanged', syncColorScheme);
  }, [hasSdk]);

  return { isTelegram };
};
