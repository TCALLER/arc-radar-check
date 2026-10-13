export enum Theme {
  Light = 'light',
  Dark = 'dark',
  Telegram = 'telegram',
}

export const ALL_THEMES = [Theme.Light, Theme.Dark, Theme.Telegram];
export const BROWSER_THEMES = [Theme.Light, Theme.Dark];

export const API_TIMEOUT_MS = 15_000;

export const HTTP_STATUS = {
  PAYMENT_REQUIRED: 402,
  INTERNAL_SERVER_ERROR: 500,
} as const;
