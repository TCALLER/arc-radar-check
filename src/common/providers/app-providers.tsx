'use client';

import { IdentityProvider } from '@/common/context/identity';

import { MockProvider } from './mock-provider';
import { QueryProvider } from './query-provider';
import { ThemeProvider } from './theme-provider';

import type { ReactNode } from 'react';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <MockProvider>
          <IdentityProvider>{children}</IdentityProvider>
        </MockProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
