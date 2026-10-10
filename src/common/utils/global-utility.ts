import { z } from 'zod';

export { cn } from 'cn';

/** Exhaustiveness guard for discriminated unions: a new variant becomes a compile error. */
export const assertNever = (value: never): never => {
  throw new Error(`Unhandled value: ${JSON.stringify(value)}`);
};

/*
 * Display safety for untrusted strings. Display only: never use the cleaned
 * text for validation or requests.
 */

// Bidi embeddings/overrides/isolates, zero-width chars + LRM/RLM, Arabic letter mark, BOM, soft hyphen.
const HIDDEN_FORMAT_CHARS = /[‪-‮⁦-⁩​-‏؜﻿­]/g;
// Line breaks and tabs would break single-line layouts; they become plain spaces.
const WHITESPACE_CONTROLS = /[\t\n\r\v\f]/g;
// Every other C0/C1 control character.
const OTHER_CONTROLS = /[\u0000-\u0008\u000E-\u001F\u007F-\u009F]/g;

export type SafeDisplayText = {
  text: string;
  /** True when invisible or text-direction characters were removed (drives the user-facing note). */
  hadHiddenChars: boolean;
};

export const toSafeDisplayText = (value: string): SafeDisplayText => {
  const withoutHidden = value.replace(HIDDEN_FORMAT_CHARS, '');
  const text = withoutHidden.replace(WHITESPACE_CONTROLS, ' ').replace(OTHER_CONTROLS, '');
  return { text, hadHiddenChars: withoutHidden.length !== value.length };
};

const HTTPS_PROTOCOL = 'https:';

/** Returns the URL only if it parses and uses exactly `https:`; otherwise null. */
export const toSafeHttpsUrl = (value: string): string | null => {
  try {
    const url = new URL(value.trim());
    return url.protocol === HTTPS_PROTOCOL ? url.href : null;
  } catch {
    return null;
  }
};

/*
 * Browser storage: the only place that touches localStorage. SSR-safe and never throws.
 */
export enum StorageKey {
  /** Browser light/dark choice. A new key, so a "telegram" saved by older builds is ignored. */
  Theme = 'arc-radar:theme',
  /** The user disconnected the wallet: don't reconnect silently on the next visit. */
  WalletDisconnected = 'arc-radar:wallet-disconnected',
}

const isBrowser = (): boolean => typeof window !== 'undefined';

export const getStorageItem = <T>(key: StorageKey): T | null => {
  if (!isBrowser()) return null;
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? null : (JSON.parse(value) as T);
  } catch {
    return null;
  }
};

export const setStorageItem = <T>(key: StorageKey, value: T): void => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the app works without it.
  }
};

export const removeStorageItem = (key: StorageKey): void => {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Storage blocked: nothing to remove.
  }
};

/*
 * Telegram WebApp SDK access. Null outside Telegram. The SDK script also loads in normal browsers,
 * and a link opened from the Mini App can still carry Telegram's `#tgWebAppData` launch data, which
 * gives the SDK init data there too. So "inside Telegram" means init data AND a way to talk to the
 * Telegram app, exactly as the SDK sends events: the injected proxy (phone, desktop),
 * `window.external.notify` (Windows), or a parent frame (web.telegram.org).
 */
const hasTelegramBridge = (): boolean =>
  window.TelegramWebviewProxy !== undefined ||
  (typeof window.external === 'object' &&
    window.external !== null &&
    'notify' in window.external) ||
  window.parent !== window;

export const getTelegramWebApp = (): TelegramWebApp | null => {
  if (!isBrowser()) return null;
  const webApp = window.Telegram?.WebApp;
  return webApp?.initData && hasTelegramBridge() ? webApp : null;
};

/** Set on <html> before the first paint when the page runs as the Telegram Mini App. */
export const TELEGRAM_ATTRIBUTE = 'data-telegram';

/**
 * Runs in <head> before the first paint, before the SDK and the app's JavaScript have loaded.
 * Without it, the theme library's own early script paints the browser's saved light/dark theme,
 * which shows in the Mini App until the app starts. It uses the same signals as
 * getTelegramWebApp, read the way the SDK reads them (no network): a Telegram bridge plus the
 * launch data from `#tgWebAppData` or the SDK's copy in sessionStorage (kept across reloads).
 * It marks <html> and copies Telegram's colours and light/dark scheme, as the SDK will.
 *
 * It is sent to the page as source text (TELEGRAM_EARLY_SCRIPT), so it must stay self-contained:
 * no imports, no outside constants, only what it is given.
 */
export const markTelegramMiniApp = (attribute: string): void => {
  try {
    const hasBridge =
      window.TelegramWebviewProxy !== undefined ||
      typeof window.external?.notify === 'function' ||
      window.parent !== window;
    if (!hasBridge) return;

    const params = new URLSearchParams(window.location.hash.slice(1));
    const stored: unknown = JSON.parse(
      window.sessionStorage.getItem('__telegram__initParams') ?? 'null',
    );
    const storedParams =
      typeof stored === 'object' && stored !== null ? new Map(Object.entries(stored)) : new Map();
    const data = params.get('tgWebAppData') ?? storedParams.get('tgWebAppData');
    const theme = params.get('tgWebAppThemeParams') ?? storedParams.get('tgWebAppThemeParams');
    if (typeof data !== 'string' || data === '') return;

    const root = document.documentElement;
    root.setAttribute(attribute, '');

    const isHexColor = (value: unknown): value is string =>
      typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
    const colors: unknown = typeof theme === 'string' ? JSON.parse(theme) : {};
    if (typeof colors !== 'object' || colors === null) return;
    for (const [key, value] of Object.entries(colors)) {
      if (isHexColor(value))
        root.style.setProperty(`--tg-theme-${key.replaceAll('_', '-')}`, value);
    }

    const background: unknown = Object.entries(colors).find(([key]) => key === 'bg_color')?.[1];
    if (!isHexColor(background)) return;
    const [red, green, blue] = [1, 3, 5].map((start) =>
      parseInt(background.slice(start, start + 2), 16),
    );
    // The SDK's rule for a dark Telegram theme (perceived brightness below 120).
    const brightness = Math.sqrt(
      0.299 * (red ?? 0) ** 2 + 0.587 * (green ?? 0) ** 2 + 0.114 * (blue ?? 0) ** 2,
    );
    root.setAttribute('data-color-scheme', brightness < 120 ? 'dark' : 'light');
  } catch {
    // Unreadable launch data: the app's own Telegram check still runs once the SDK loads.
  }
};

/** markTelegramMiniApp as an inline <head> script. */
export const TELEGRAM_EARLY_SCRIPT = `(${markTelegramMiniApp.toString()})(${JSON.stringify(TELEGRAM_ATTRIBUTE)});`;

/** True when TELEGRAM_EARLY_SCRIPT recognised the Mini App, whether or not the SDK has loaded. */
export const isMarkedTelegram = (): boolean =>
  isBrowser() && document.documentElement.hasAttribute(TELEGRAM_ATTRIBUTE);

export const TELEGRAM_SDK_URL = 'https://telegram.org/js/telegram-web-app.js';

const TELEGRAM_LAUNCH_PARAM = 'tgWebAppData';
const TELEGRAM_SDK_STORAGE_KEY = '__telegram__initParams';
const TELEGRAM_WEB_ORIGIN = 'https://web.telegram.org';

/** Telegram's launch data: from the address, else the copy the SDK keeps for reloads. */
const readTelegramInitData = (): string | null => {
  const fromHash = new URLSearchParams(window.location.hash.slice(1)).get(TELEGRAM_LAUNCH_PARAM);
  if (fromHash) return fromHash;
  try {
    const stored = z
      .object({ [TELEGRAM_LAUNCH_PARAM]: z.string().min(1) })
      .safeParse(JSON.parse(window.sessionStorage.getItem(TELEGRAM_SDK_STORAGE_KEY) ?? 'null'));
    return stored.success ? stored.data[TELEGRAM_LAUNCH_PARAM] : null;
  } catch {
    return null;
  }
};

const TelegramUserSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  username: z.string().optional(),
});

/**
 * The Telegram user, from the SDK's `initDataUnsafe` or, when the SDK hasn't loaded, from the
 * same launch data the SDK would read. Unvalidated and untrusted: display only.
 */
export const getTelegramUser = (): TelegramWebAppUser | null => {
  const sdkUser = getTelegramWebApp()?.initDataUnsafe.user;
  if (sdkUser) return sdkUser;
  if (!isMarkedTelegram()) return null;
  const rawUser = new URLSearchParams(readTelegramInitData() ?? '').get('user');
  if (!rawUser) return null;
  try {
    const parsed = TelegramUserSchema.safeParse(JSON.parse(rawUser));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

/** Sends an event to the Telegram app the way the SDK does, through whichever bridge exists. */
const postTelegramEvent = (eventType: string, eventData: object): void => {
  if (window.TelegramWebviewProxy) {
    window.TelegramWebviewProxy.postEvent(eventType, JSON.stringify(eventData));
  } else if (typeof window.external?.notify === 'function') {
    window.external.notify(JSON.stringify({ eventType, eventData }));
  } else if (window.parent !== window) {
    window.parent.postMessage(JSON.stringify({ eventType, eventData }), TELEGRAM_WEB_ORIGIN);
  }
};

/**
 * Opens a link outside the Mini App. Uses the SDK when it has loaded; otherwise sends Telegram's
 * documented `web_app_open_link` event itself, so the button works even if the SDK never arrives.
 */
export const openTelegramLink = (url: string): void => {
  const webApp = getTelegramWebApp();
  if (webApp) {
    webApp.openLink(url);
    return;
  }
  if (isMarkedTelegram()) postTelegramEvent('web_app_open_link', { url });
};

/** Fired on window when the Telegram SDK becomes available after the app has started. */
export const TELEGRAM_SDK_READY_EVENT = 'arc-radar:telegram-sdk-ready';

const SDK_CHECK_INTERVAL_MS = 500;
const SDK_RELOAD_AFTER_MS = 3_000;
const SDK_GIVE_UP_AFTER_MS = 20_000;
let isWaitingForSdk = false;

/**
 * Inside the Mini App the SDK is usually ready when the app starts, but on a phone it can be late
 * or fail (slow network, a service worker restarting). Then the name, Open in browser and the
 * hidden theme switch would stay missing for the whole session. This waits for it, loads it again
 * once if it hasn't arrived after a few seconds, and fires TELEGRAM_SDK_READY_EVENT when it is
 * usable. Does nothing outside the Mini App or when the SDK is already there.
 */
export const waitForTelegramSdk = (): void => {
  if (!isMarkedTelegram() || getTelegramWebApp() || isWaitingForSdk) return;
  isWaitingForSdk = true;
  let elapsedMs = 0;
  let hasReloaded = false;

  const timer = window.setInterval(() => {
    elapsedMs += SDK_CHECK_INTERVAL_MS;
    if (getTelegramWebApp()) {
      window.clearInterval(timer);
      isWaitingForSdk = false;
      window.dispatchEvent(new Event(TELEGRAM_SDK_READY_EVENT));
      return;
    }
    if (!hasReloaded && elapsedMs >= SDK_RELOAD_AFTER_MS && !window.Telegram?.WebApp) {
      hasReloaded = true;
      const script = document.createElement('script');
      // A fresh URL, so nothing cached from the failed load is reused.
      script.src = `${TELEGRAM_SDK_URL}?reload=1`;
      document.head.appendChild(script);
    }
    if (elapsedMs >= SDK_GIVE_UP_AFTER_MS) {
      window.clearInterval(timer);
      isWaitingForSdk = false;
    }
  }, SDK_CHECK_INTERVAL_MS);
};

const TELEGRAM_LAUNCH_HASH = 'tgWebAppData=';

/**
 * Outside Telegram, removes Telegram's launch data (`#tgWebAppData=…`, signed user data) from the
 * address bar, so it isn't copied, shared or bookmarked from a browser.
 */
export const clearTelegramLaunchHash = (): void => {
  // Never inside the Mini App, even before its SDK has started: the SDK reads this data.
  if (!isBrowser() || getTelegramWebApp() || isMarkedTelegram()) return;
  const { hash, pathname, search } = window.location;
  if (!hash.includes(TELEGRAM_LAUNCH_HASH)) return;
  window.history.replaceState(window.history.state, '', `${pathname}${search}`);
};

/** Light tap feedback inside Telegram (Check, Connect, Copy). No-op elsewhere. */
export const hapticTap = (): void => {
  getTelegramWebApp()?.HapticFeedback?.impactOccurred('light');
};

/** Error feedback inside Telegram when a check fails. No-op elsewhere. */
export const hapticError = (): void => {
  getTelegramWebApp()?.HapticFeedback?.notificationOccurred('error');
};
