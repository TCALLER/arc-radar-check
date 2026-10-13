import { useContext } from 'react';

import { IdentityContext, type IdentityContextValue } from './identity-context';

/** The only way the app reads auth state (07-auth-and-security). */
export const useAuth = (): IdentityContextValue => {
  const context = useContext(IdentityContext);
  if (!context) {
    throw new Error('useAuth must be used inside IdentityProvider');
  }
  return context;
};
