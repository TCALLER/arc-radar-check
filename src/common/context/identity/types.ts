export enum AuthStatus {
  Loading = 'loading',
  Authenticated = 'authenticated',
  Unauthenticated = 'unauthenticated',
}

/** Display data only. Never proof of identity, holding or payment. */
export type AuthUser = { displayName: string };

export interface AuthService {
  getCurrentUser: () => Promise<AuthUser | null>;
}
