import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createFakeTelegramWebApp,
  installFakeTelegram,
  removeFakeTelegram,
} from '@/common/test/fake-telegram';
import { TELEGRAM_SDK_READY_EVENT } from '@/common/utils/global-utility';
import { logger } from '@/common/utils/logger';

import { realAuthService } from './auth-service';
import { mockAuthService } from './auth-service.mock';
import { IdentityProvider } from './identity-context';
import { AuthStatus, type AuthService } from './types';
import { useAuth } from './use-auth';

import type { ReactNode } from 'react';

vi.mock('@/common/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

afterEach(() => {
  removeFakeTelegram();
});

const renderAuth = (service?: AuthService) =>
  renderHook(() => useAuth(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <IdentityProvider service={service}>{children}</IdentityProvider>
    ),
  });

describe('IdentityProvider and useAuth', () => {
  it('throws a clear error outside IdentityProvider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used inside IdentityProvider',
    );
  });

  it('starts loading, then reports the user from the service', async () => {
    const { result } = renderAuth({
      getCurrentUser: () => Promise.resolve({ displayName: 'Alex' }),
    });
    expect(result.current.status).toBe(AuthStatus.Loading);
    await waitFor(() => expect(result.current.status).toBe(AuthStatus.Authenticated));
    expect(result.current.user).toEqual({ displayName: 'Alex' });
  });

  it('is unauthenticated when there is no user', async () => {
    const { result } = renderAuth({ getCurrentUser: () => Promise.resolve(null) });
    await waitFor(() => expect(result.current.status).toBe(AuthStatus.Unauthenticated));
    expect(result.current.user).toBeNull();
  });

  it('is unauthenticated and logs when the service fails', async () => {
    const { result } = renderAuth({ getCurrentUser: () => Promise.reject(new Error('down')) });
    await waitFor(() => expect(result.current.status).toBe(AuthStatus.Unauthenticated));
    expect(logger.warn).toHaveBeenCalled();
  });

  it('uses the mock service when auth mocking is enabled (test env)', async () => {
    installFakeTelegram(
      createFakeTelegramWebApp({ initDataUnsafe: { user: { first_name: 'Alex' } } }),
    );
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.user).toEqual({ displayName: 'Alex' }));
  });

  it('reads the user again when a late Telegram SDK arrives', async () => {
    const { result } = renderAuth();
    await waitFor(() => expect(result.current.status).toBe(AuthStatus.Unauthenticated));

    installFakeTelegram(
      createFakeTelegramWebApp({ initDataUnsafe: { user: { first_name: 'Alex' } } }),
    );
    act(() => {
      window.dispatchEvent(new Event(TELEGRAM_SDK_READY_EVENT));
    });
    await waitFor(() => expect(result.current.user).toEqual({ displayName: 'Alex' }));
  });

  it('renders its children', () => {
    render(<IdentityProvider service={realAuthService}>content</IdentityProvider>);
    expect(screen.getByText('content')).toBeInTheDocument();
  });
});

describe('auth services', () => {
  it('mock service reads the Telegram name, real service trusts nothing on the client', async () => {
    installFakeTelegram(
      createFakeTelegramWebApp({ initDataUnsafe: { user: { first_name: 'Alex' } } }),
    );
    await expect(mockAuthService.getCurrentUser()).resolves.toEqual({ displayName: 'Alex' });
    await expect(realAuthService.getCurrentUser()).resolves.toBeNull();
  });
});
