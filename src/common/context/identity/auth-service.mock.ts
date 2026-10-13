import { readTelegramUser } from './telegram-user';

import type { AuthService } from './types';

/**
 * Stands in for the server's answer: takes the name straight from Telegram's unvalidated init
 * data. Display only; nothing in the app is gated on it.
 */
export const mockAuthService: AuthService = {
  getCurrentUser: () => Promise.resolve(readTelegramUser()),
};
