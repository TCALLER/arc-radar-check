import type { AuthService } from './types';

/**
 * Real service. The client's backend is out of scope, so it reports no user: unvalidated
 * Telegram data is never shown as the real session.
 * TODO(server): send `Telegram.WebApp.initData` to the backend, which validates its hash with the
 * bot token and returns the user; return that user here.
 */
export const realAuthService: AuthService = {
  getCurrentUser: () => Promise.resolve(null),
};
