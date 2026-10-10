import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { installFakeTelegram, removeFakeTelegram } from '@/common/test/fake-telegram';

import { useTelegramTheme } from './use-telegram-theme';

const createWebApp = (initData: string): TelegramWebApp => ({
  initData,
  initDataUnsafe: {},
  colorScheme: 'dark',
  ready: vi.fn(),
  expand: vi.fn(),
  openLink: vi.fn(),
  onEvent: vi.fn(),
  offEvent: vi.fn(),
});

afterEach(() => {
  removeFakeTelegram();
  document.documentElement.removeAttribute('data-color-scheme');
});

describe('useTelegramTheme', () => {
  it('does nothing outside Telegram', () => {
    const { result } = renderHook(() => useTelegramTheme());
    expect(result.current.isTelegram).toBe(false);
  });

  it('does nothing when the SDK is loaded but there is no init data', () => {
    installFakeTelegram(createWebApp(''));
    const { result } = renderHook(() => useTelegramTheme());
    expect(result.current.isTelegram).toBe(false);
  });

  it('sets up the SDK and the colour scheme inside Telegram', () => {
    const webApp = createWebApp('query_id=1');
    installFakeTelegram(webApp);

    const { result, unmount } = renderHook(() => useTelegramTheme());

    expect(result.current.isTelegram).toBe(true);
    expect(webApp.ready).toHaveBeenCalled();
    expect(document.documentElement).toHaveAttribute('data-color-scheme', 'dark');

    unmount();
    expect(webApp.offEvent).toHaveBeenCalledWith('themeChanged', expect.any(Function));
  });
});
