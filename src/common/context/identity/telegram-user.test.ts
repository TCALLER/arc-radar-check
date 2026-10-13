import { afterEach, describe, expect, it } from 'vitest';

import {
  createFakeTelegramWebApp,
  installFakeTelegram,
  removeFakeTelegram,
} from '@/common/test/fake-telegram';

import { readTelegramUser } from './telegram-user';

const withUser = (user: TelegramWebAppUser | undefined, initData = 'query_id=1') => {
  installFakeTelegram(createFakeTelegramWebApp({ initData, initDataUnsafe: { user } }));
};

afterEach(() => {
  removeFakeTelegram();
});

describe('readTelegramUser', () => {
  it('returns null outside Telegram', () => {
    expect(readTelegramUser()).toBeNull();
  });

  it('returns null when the SDK is loaded without init data', () => {
    withUser({ first_name: 'Alex' }, '');
    expect(readTelegramUser()).toBeNull();
  });

  it('joins first and last name', () => {
    withUser({ first_name: ' Alex ', last_name: 'Kim' });
    expect(readTelegramUser()).toEqual({ displayName: 'Alex Kim' });
  });

  it('falls back to the username', () => {
    withUser({ first_name: '  ', username: 'alex_k' });
    expect(readTelegramUser()).toEqual({ displayName: 'alex_k' });
  });

  it('returns null when there is no usable name', () => {
    withUser({});
    expect(readTelegramUser()).toBeNull();
    withUser(undefined);
    expect(readTelegramUser()).toBeNull();
  });
});
