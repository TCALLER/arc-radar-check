import { getTelegramUser } from '@/common/utils/global-utility';

import type { AuthUser } from './types';

/**
 * Reads the Telegram user's name from the unvalidated init data (SDK, or the launch data when the
 * SDK hasn't loaded), for display only.
 * Returns null outside Telegram or when the SDK gives no usable name.
 */
export const readTelegramUser = (): AuthUser | null => {
  const user = getTelegramUser();
  if (!user) return null;

  const fullName = [user.first_name, user.last_name]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');
  const displayName = fullName || user.username?.trim() || '';
  return displayName ? { displayName } : null;
};
