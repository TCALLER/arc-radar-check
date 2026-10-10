'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

import { ALL_THEMES, Theme } from '@/common/constants';
import { useIsTelegram } from '@/common/hooks/use-telegram-theme';
import { StorageKey } from '@/common/utils/global-utility';

import type { ReactNode } from 'react';

/**
 * Inside Telegram the telegram theme is forced and never saved; only the browser's light/dark
 * choice is stored. Telegram's Mini App and its in-app browser share storage, so a saved
 * "telegram" would show in the browser, and a browser's saved "dark" would take over the Mini App.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const isTelegram = useIsTelegram();

  return (
    <NextThemesProvider
      attribute="data-theme"
      themes={ALL_THEMES}
      defaultTheme={Theme.Light}
      enableSystem={false}
      forcedTheme={isTelegram ? Theme.Telegram : undefined}
      storageKey={StorageKey.Theme}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
