'use client';

import { createContext, useEffect, useState, type ReactNode } from 'react';

import { env } from '@/common/config/env';
import { TELEGRAM_SDK_READY_EVENT } from '@/common/utils/global-utility';
import { logger } from '@/common/utils/logger';

import { realAuthService } from './auth-service';
import { mockAuthService } from './auth-service.mock';
import { AuthStatus, type AuthService, type AuthUser } from './types';

const defaultService: AuthService =
  env.NEXT_PUBLIC_AUTH_MOCKING === 'enabled' ? mockAuthService : realAuthService;

export type IdentityContextValue = {
  user: AuthUser | null;
  status: AuthStatus;
};

export const IdentityContext = createContext<IdentityContextValue | null>(null);

type IdentityProviderProps = {
  children: ReactNode;
  /** Overridable for tests. */
  service?: AuthService;
};

export function IdentityProvider({ children, service = defaultService }: IdentityProviderProps) {
  const [value, setValue] = useState<IdentityContextValue>({
    user: null,
    status: AuthStatus.Loading,
  });

  useEffect(() => {
    let isActive = true;
    const readUser = () => {
      service
        .getCurrentUser()
        .then((user) => {
          if (!isActive) return;
          setValue({ user, status: user ? AuthStatus.Authenticated : AuthStatus.Unauthenticated });
        })
        .catch((error: unknown) => {
          logger.warn('Could not read the current user', error);
          if (isActive) setValue({ user: null, status: AuthStatus.Unauthenticated });
        });
    };
    readUser();
    // A Telegram SDK that arrives late brings the Telegram name with it.
    window.addEventListener(TELEGRAM_SDK_READY_EVENT, readUser);
    return () => {
      isActive = false;
      window.removeEventListener(TELEGRAM_SDK_READY_EVENT, readUser);
    };
  }, [service]);

  return <IdentityContext.Provider value={value}>{children}</IdentityContext.Provider>;
}
