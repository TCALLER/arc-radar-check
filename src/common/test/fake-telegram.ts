import { vi } from 'vitest';

/** A Telegram WebApp SDK stand-in for tests. An empty `initData` means "not inside Telegram". */
export const createFakeTelegramWebApp = (
  overrides: Partial<TelegramWebApp> = {},
): TelegramWebApp => ({
  initData: 'query_id=test&hash=fake',
  initDataUnsafe: {},
  colorScheme: 'light',
  ready: vi.fn(),
  expand: vi.fn(),
  openLink: vi.fn(),
  onEvent: vi.fn(),
  offEvent: vi.fn(),
  HapticFeedback: { impactOccurred: vi.fn(), notificationOccurred: vi.fn() },
  ...overrides,
});

/** Puts a fake WebApp in place, with the bridge the Telegram apps inject (inside Telegram). */
export const installFakeTelegram = (webApp: TelegramWebApp, { withBridge = true } = {}): void => {
  window.Telegram = { WebApp: webApp };
  if (withBridge) window.TelegramWebviewProxy = { postEvent: vi.fn() };
};

export const removeFakeTelegram = (): void => {
  delete window.Telegram;
  delete window.TelegramWebviewProxy;
};
