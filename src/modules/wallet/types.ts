import type { Address } from 'viem';

export type WalletStatus = 'disconnected' | 'connecting' | 'connected' | 'noProvider';

/** Why the last wallet request didn't work, for a short message. */
export type WalletError = 'rejected' | 'pending' | 'failed' | null;

export type WalletState = {
  status: WalletStatus;
  address: Address | null;
  chainId: number | null;
  error: WalletError;
  /** A network switch is waiting for the user to confirm it in the wallet. */
  isSwitching: boolean;
  /** The open connect or switch request has had no answer for a while (WALLET_SLOW_MS). */
  isSlow: boolean;
};
