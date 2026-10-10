import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createFakeTelegramWebApp,
  installFakeTelegram,
  removeFakeTelegram,
} from '@/common/test/fake-telegram';

import {
  assertNever,
  cn,
  getStorageItem,
  clearTelegramLaunchHash,
  getTelegramUser,
  getTelegramWebApp,
  markTelegramMiniApp,
  TELEGRAM_EARLY_SCRIPT,
  openTelegramLink,
  TELEGRAM_ATTRIBUTE,
  TELEGRAM_SDK_READY_EVENT,
  TELEGRAM_SDK_URL,
  waitForTelegramSdk,
  hapticError,
  hapticTap,
  removeStorageItem,
  setStorageItem,
  StorageKey,
  toSafeDisplayText,
  toSafeHttpsUrl,
} from './global-utility';

describe('cn', () => {
  it('merges classes and resolves Tailwind conflicts', () => {
    const isHidden = false;
    expect(cn('px-2 py-1', isHidden && 'hidden', 'px-4')).toBe('py-1 px-4');
  });
});

describe('assertNever', () => {
  it('throws with the unhandled value', () => {
    expect(() => assertNever('surprise' as never)).toThrow('Unhandled value: "surprise"');
  });
});

describe('toSafeDisplayText', () => {
  it('leaves normal text unchanged', () => {
    expect(toSafeDisplayText('Sample Token')).toEqual({
      text: 'Sample Token',
      hadHiddenChars: false,
    });
  });

  it('keeps HTML-like text as literal characters', () => {
    expect(toSafeDisplayText("<script>alert('x')</script>").text).toBe(
      "<script>alert('x')</script>",
    );
  });

  it.each([
    ['U+202E right-to-left override', '‮evil-label'],
    ['U+202A left-to-right embedding', '‪evil-label'],
    ['U+2066 left-to-right isolate', 'evil⁦-label'],
    ['U+2069 pop directional isolate', 'evil-label⁩'],
    ['U+200B zero-width space', 'evil​-label'],
    ['U+200F right-to-left mark', 'evil-‏label'],
    ['U+061C Arabic letter mark', '؜evil-label'],
    ['U+FEFF byte order mark', '﻿evil-label'],
    ['U+00AD soft hyphen', 'evil­-label'],
  ])('strips %s and reports it', (_name, value) => {
    expect(toSafeDisplayText(value)).toEqual({ text: 'evil-label', hadHiddenChars: true });
  });

  it('turns line breaks and tabs into spaces and drops other control characters', () => {
    expect(toSafeDisplayText('a\nb\tc\u0007d\u0085e')).toEqual({
      text: 'a b cde',
      hadHiddenChars: false,
    });
  });

  it('can leave an empty string, for the caller to replace with a fallback', () => {
    expect(toSafeDisplayText('‮').text).toBe('');
  });
});

describe('toSafeHttpsUrl', () => {
  it('accepts https URLs', () => {
    expect(toSafeHttpsUrl('https://explorer.arc.io/')).toBe('https://explorer.arc.io/');
    expect(toSafeHttpsUrl('  https://explorer.arc.io/token  ')).toBe(
      'https://explorer.arc.io/token',
    );
  });

  it.each([
    'javascript:alert(1)',
    'JAVASCRIPT:alert(1)',
    '  javascript:alert(1)',
    'java\tscript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'http://explorer.arc.io/',
    'ftp://explorer.arc.io/',
    '//explorer.arc.io/',
    '/relative/path',
    'not a url',
    '',
  ])('rejects %j', (value) => {
    expect(toSafeHttpsUrl(value)).toBeNull();
  });
});

describe('storage helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    removeStorageItem(StorageKey.WalletDisconnected);
  });

  it('stores, reads and removes JSON values', () => {
    setStorageItem(StorageKey.WalletDisconnected, true);
    expect(getStorageItem<boolean>(StorageKey.WalletDisconnected)).toBe(true);
    removeStorageItem(StorageKey.WalletDisconnected);
    expect(getStorageItem(StorageKey.WalletDisconnected)).toBeNull();
  });

  it('returns null for corrupt values and never throws when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('{not json');
    expect(getStorageItem(StorageKey.WalletDisconnected)).toBeNull();

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => setStorageItem(StorageKey.WalletDisconnected, true)).not.toThrow();
    expect(() => removeStorageItem(StorageKey.WalletDisconnected)).not.toThrow();
  });
});

describe('Telegram helpers', () => {
  afterEach(() => {
    removeFakeTelegram();
  });

  it('report no WebApp outside Telegram, and haptics do nothing', () => {
    expect(getTelegramWebApp()).toBeNull();
    expect(() => {
      hapticTap();
      hapticError();
    }).not.toThrow();
  });

  it('report no WebApp when the SDK has no init data', () => {
    installFakeTelegram(createFakeTelegramWebApp({ initData: '' }));
    expect(getTelegramWebApp()).toBeNull();
  });

  it('report no WebApp in a browser opened with Telegram launch data but no Telegram bridge', () => {
    installFakeTelegram(createFakeTelegramWebApp(), { withBridge: false });
    expect(getTelegramWebApp()).toBeNull();
  });

  it('accept the Windows bridge (window.external.notify)', () => {
    const webApp = createFakeTelegramWebApp();
    installFakeTelegram(webApp, { withBridge: false });
    vi.stubGlobal('external', { notify: vi.fn() });
    expect(getTelegramWebApp()).toBe(webApp);
    vi.unstubAllGlobals();
  });

  it('trigger Telegram haptics inside Telegram', () => {
    const webApp = createFakeTelegramWebApp();
    installFakeTelegram(webApp);
    expect(getTelegramWebApp()).toBe(webApp);

    hapticTap();
    hapticError();
    expect(webApp.HapticFeedback?.impactOccurred).toHaveBeenCalledWith('light');
    expect(webApp.HapticFeedback?.notificationOccurred).toHaveBeenCalledWith('error');
  });

  it('cope with a WebApp without HapticFeedback', () => {
    installFakeTelegram(createFakeTelegramWebApp({ HapticFeedback: undefined }));
    expect(() => hapticTap()).not.toThrow();
  });
});

describe('clearTelegramLaunchHash', () => {
  const launchUrl = '/?holder=true#tgWebAppData=user%3D%7B%7D&tgWebAppVersion=8.0';

  afterEach(() => {
    removeFakeTelegram();
    window.history.replaceState(null, '', '/');
  });

  it("removes Telegram's launch data from the address bar in a browser", () => {
    window.history.replaceState(null, '', launchUrl);
    installFakeTelegram(createFakeTelegramWebApp(), { withBridge: false });
    clearTelegramLaunchHash();
    expect(window.location.search).toBe('?holder=true');
    expect(window.location.hash).toBe('');
  });

  it('keeps the launch data inside the Mini App while its SDK is still loading', () => {
    window.history.replaceState(null, '', launchUrl);
    document.documentElement.setAttribute(TELEGRAM_ATTRIBUTE, '');
    clearTelegramLaunchHash();
    expect(window.location.hash).toContain('tgWebAppData=');
    document.documentElement.removeAttribute(TELEGRAM_ATTRIBUTE);
  });

  it('leaves the address alone inside Telegram and for other fragments', () => {
    window.history.replaceState(null, '', launchUrl);
    installFakeTelegram(createFakeTelegramWebApp());
    clearTelegramLaunchHash();
    expect(window.location.hash).toContain('tgWebAppData=');

    removeFakeTelegram();
    window.history.replaceState(null, '', '/#section');
    clearTelegramLaunchHash();
    expect(window.location.hash).toBe('#section');
  });
});

describe('waitForTelegramSdk', () => {
  const html = document.documentElement;

  afterEach(() => {
    vi.useRealTimers();
    removeFakeTelegram();
    html.removeAttribute(TELEGRAM_ATTRIBUTE);
    document.head.querySelectorAll(`script[src^="${TELEGRAM_SDK_URL}"]`).forEach((s) => s.remove());
  });

  it('does nothing outside the Mini App', () => {
    vi.useFakeTimers();
    const onReady = vi.fn();
    window.addEventListener(TELEGRAM_SDK_READY_EVENT, onReady);
    waitForTelegramSdk();
    vi.advanceTimersByTime(30_000);
    expect(onReady).not.toHaveBeenCalled();
    expect(document.head.querySelector(`script[src^="${TELEGRAM_SDK_URL}"]`)).toBeNull();
    window.removeEventListener(TELEGRAM_SDK_READY_EVENT, onReady);
  });

  it('reloads a missing SDK once and announces it when it arrives', () => {
    vi.useFakeTimers();
    html.setAttribute(TELEGRAM_ATTRIBUTE, '');
    const onReady = vi.fn();
    window.addEventListener(TELEGRAM_SDK_READY_EVENT, onReady);

    waitForTelegramSdk();
    vi.advanceTimersByTime(3_000);
    expect(document.head.querySelectorAll(`script[src^="${TELEGRAM_SDK_URL}"]`)).toHaveLength(1);

    installFakeTelegram(createFakeTelegramWebApp());
    vi.advanceTimersByTime(500);
    expect(onReady).toHaveBeenCalledTimes(1);
    window.removeEventListener(TELEGRAM_SDK_READY_EVENT, onReady);
  });

  it('gives up quietly when the SDK never comes', () => {
    vi.useFakeTimers();
    html.setAttribute(TELEGRAM_ATTRIBUTE, '');
    const onReady = vi.fn();
    window.addEventListener(TELEGRAM_SDK_READY_EVENT, onReady);

    waitForTelegramSdk();
    vi.advanceTimersByTime(25_000);
    installFakeTelegram(createFakeTelegramWebApp());
    vi.advanceTimersByTime(1_000);
    expect(onReady).not.toHaveBeenCalled();
    expect(document.head.querySelectorAll(`script[src^="${TELEGRAM_SDK_URL}"]`)).toHaveLength(1);
    window.removeEventListener(TELEGRAM_SDK_READY_EVENT, onReady);
  });
});

describe('Telegram without its SDK (it never loaded)', () => {
  const html = document.documentElement;
  const user = encodeURIComponent(JSON.stringify({ first_name: 'Alex', last_name: 'K' }));
  const launch = `/#tgWebAppData=${encodeURIComponent(`query_id=1&user=${user}&hash=x`)}`;

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    removeFakeTelegram();
    html.removeAttribute(TELEGRAM_ATTRIBUTE);
    window.history.replaceState(null, '', '/');
  });

  it('reads the user from the launch data in the address', () => {
    window.history.replaceState(null, '', launch);
    html.setAttribute(TELEGRAM_ATTRIBUTE, '');
    expect(getTelegramUser()).toEqual({ first_name: 'Alex', last_name: 'K' });
  });

  it("reads the user from the SDK's saved copy after a reload", () => {
    html.setAttribute(TELEGRAM_ATTRIBUTE, '');
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(
      JSON.stringify({ tgWebAppData: `query_id=1&user=${user}` }),
    );
    expect(getTelegramUser()).toEqual({ first_name: 'Alex', last_name: 'K' });
  });

  it('returns no user outside the Mini App, or for missing or malformed data', () => {
    window.history.replaceState(null, '', launch);
    expect(getTelegramUser()).toBeNull();

    html.setAttribute(TELEGRAM_ATTRIBUTE, '');
    window.history.replaceState(null, '', '/#tgWebAppData=query_id%3D1%26user%3D%7Bbroken');
    expect(getTelegramUser()).toBeNull();
    window.history.replaceState(null, '', '/#tgWebAppData=query_id%3D1');
    expect(getTelegramUser()).toBeNull();
    window.history.replaceState(null, '', '/');
    expect(getTelegramUser()).toBeNull();
  });

  it("prefers the SDK's user when it has loaded", () => {
    installFakeTelegram(
      createFakeTelegramWebApp({ initDataUnsafe: { user: { first_name: 'Sam' } } }),
    );
    expect(getTelegramUser()).toEqual({ first_name: 'Sam' });
  });

  it('opens a link through the SDK, or through the Telegram bridge without it', () => {
    const webApp = createFakeTelegramWebApp();
    installFakeTelegram(webApp);
    openTelegramLink('https://example.com/');
    expect(webApp.openLink).toHaveBeenCalledWith('https://example.com/');

    removeFakeTelegram();
    const postEvent = vi.fn();
    window.TelegramWebviewProxy = { postEvent };
    html.setAttribute(TELEGRAM_ATTRIBUTE, '');
    openTelegramLink('https://example.com/');
    expect(postEvent).toHaveBeenCalledWith(
      'web_app_open_link',
      JSON.stringify({ url: 'https://example.com/' }),
    );
  });

  it('uses the Windows bridge, and does nothing outside the Mini App', () => {
    const notify = vi.fn();
    vi.stubGlobal('external', { notify });
    openTelegramLink('https://example.com/');
    expect(notify).not.toHaveBeenCalled();

    html.setAttribute(TELEGRAM_ATTRIBUTE, '');
    openTelegramLink('https://example.com/');
    expect(notify).toHaveBeenCalledWith(
      JSON.stringify({
        eventType: 'web_app_open_link',
        eventData: { url: 'https://example.com/' },
      }),
    );
  });
});

describe('markTelegramMiniApp (the early <head> script)', () => {
  const html = document.documentElement;
  const theme = encodeURIComponent(JSON.stringify({ bg_color: '#17212b', text_color: '#f5f5f5' }));
  const launch = `/#tgWebAppData=query_id%3D1&tgWebAppThemeParams=${theme}`;

  afterEach(() => {
    removeFakeTelegram();
    vi.restoreAllMocks();
    html.removeAttribute(TELEGRAM_ATTRIBUTE);
    html.removeAttribute('data-color-scheme');
    html.style.removeProperty('--tg-theme-bg-color');
    html.style.removeProperty('--tg-theme-text-color');
    window.history.replaceState(null, '', '/');
  });

  it("marks the Mini App and copies Telegram's colours and dark scheme", () => {
    window.history.replaceState(null, '', launch);
    window.TelegramWebviewProxy = { postEvent: vi.fn() };
    markTelegramMiniApp(TELEGRAM_ATTRIBUTE);

    expect(html).toHaveAttribute(TELEGRAM_ATTRIBUTE, '');
    expect(html).toHaveAttribute('data-color-scheme', 'dark');
    expect(html.style.getPropertyValue('--tg-theme-bg-color')).toBe('#17212b');
    expect(html.style.getPropertyValue('--tg-theme-text-color')).toBe('#f5f5f5');
  });

  it("uses the SDK's saved launch data after a reload", () => {
    window.TelegramWebviewProxy = { postEvent: vi.fn() };
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(
      JSON.stringify({ tgWebAppData: 'query_id=1' }),
    );
    markTelegramMiniApp(TELEGRAM_ATTRIBUTE);
    expect(html).toHaveAttribute(TELEGRAM_ATTRIBUTE, '');
    expect(html).not.toHaveAttribute('data-color-scheme');
  });

  it('leaves a browser alone, even with the launch data in the address', () => {
    window.history.replaceState(null, '', launch);
    markTelegramMiniApp(TELEGRAM_ATTRIBUTE);
    expect(html).not.toHaveAttribute(TELEGRAM_ATTRIBUTE);
  });

  it('does nothing without launch data, and survives malformed colours', () => {
    window.TelegramWebviewProxy = { postEvent: vi.fn() };
    markTelegramMiniApp(TELEGRAM_ATTRIBUTE);
    expect(html).not.toHaveAttribute(TELEGRAM_ATTRIBUTE);

    window.history.replaceState(null, '', '/#tgWebAppData=query_id%3D1&tgWebAppThemeParams=%7Bbad');
    expect(() => markTelegramMiniApp(TELEGRAM_ATTRIBUTE)).not.toThrow();
    expect(html).not.toHaveAttribute('data-color-scheme');
  });

  it('is sent as a self-calling script with the attribute name', () => {
    expect(TELEGRAM_EARLY_SCRIPT).toMatch(/^\(.*\)\("data-telegram"\);$/s);
  });
});
