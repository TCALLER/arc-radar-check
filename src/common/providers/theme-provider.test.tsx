import { act, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Theme } from '@/common/constants';
import { installFakeTelegram, removeFakeTelegram } from '@/common/test/fake-telegram';
import { StorageKey } from '@/common/utils/global-utility';

import { ThemeProvider } from './theme-provider';

const createWebApp = (): TelegramWebApp => ({
  initData: 'query_id=1',
  initDataUnsafe: {},
  colorScheme: 'light',
  ready: vi.fn(),
  expand: vi.fn(),
  openLink: vi.fn(),
  onEvent: vi.fn(),
  offEvent: vi.fn(),
});

const html = document.documentElement;

/** Saved values as next-themes stores them (plain strings), without touching real storage. */
const stubStorage = (saved: Record<string, string>) => {
  // next-themes reads the system scheme even with enableSystem off; jsdom has no matchMedia.
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addListener: vi.fn(),
    removeListener: vi.fn(),
  }));
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => saved[key] ?? null);
  return vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => undefined);
};

afterEach(() => {
  removeFakeTelegram();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  html.removeAttribute('data-theme');
});

describe('ThemeProvider', () => {
  it('uses the saved browser choice outside Telegram', async () => {
    stubStorage({ [StorageKey.Theme]: Theme.Dark });
    render(<ThemeProvider>page</ThemeProvider>);
    await waitFor(() => expect(html).toHaveAttribute('data-theme', Theme.Dark));
  });

  it('ignores a "telegram" theme saved by an older build under the old key', async () => {
    stubStorage({ theme: Theme.Telegram });
    render(<ThemeProvider>page</ThemeProvider>);
    await waitFor(() => expect(html).toHaveAttribute('data-theme', Theme.Light));
  });

  it('forces the telegram theme inside Telegram without saving it', async () => {
    const setItem = stubStorage({ [StorageKey.Theme]: Theme.Dark });
    installFakeTelegram(createWebApp());
    render(<ThemeProvider>page</ThemeProvider>);

    await waitFor(() => expect(html).toHaveAttribute('data-theme', Theme.Telegram));
    expect(setItem).not.toHaveBeenCalledWith(StorageKey.Theme, Theme.Telegram);
  });

  it('keeps the telegram theme when the browser saves a theme in shared storage', async () => {
    stubStorage({});
    installFakeTelegram(createWebApp());
    render(<ThemeProvider>page</ThemeProvider>);
    await waitFor(() => expect(html).toHaveAttribute('data-theme', Theme.Telegram));

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: StorageKey.Theme, newValue: Theme.Dark }),
      );
    });

    expect(html).toHaveAttribute('data-theme', Theme.Telegram);
  });
});
