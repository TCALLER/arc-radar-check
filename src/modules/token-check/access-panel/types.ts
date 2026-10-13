import type { AccessState } from '../types';
import type { WalletSummary } from '../wallet-row';

export type NoWalletPlatform = 'desktop' | 'mobile' | 'telegram';

/** Wallet + holder-check state and handlers, shared by every place that offers Connect wallet. */
export type AccessControls = {
  state: AccessState;
  wallet: WalletSummary | null;
  noWalletPlatform: NoWalletPlatform;
  isLinkCopied: boolean;
  /** The page link to copy by hand, when the browser blocked copying. */
  manualCopyUrl: string | null;
  /** Short message after a cancelled or failed wallet request. */
  walletMessage: string | null;
  /** The wallet is showing (or queueing) the network switch for the user to confirm. */
  isSwitchingNetwork: boolean;
  /** The open connect or switch request has had no answer for a while: offer Cancel. */
  isWalletSlow: boolean;
  onConnect: () => void;
  /** Stops waiting for the open connect or switch request. */
  onCancelWalletRequest: () => void;
  /** Forgets the wallet here and asks it to revoke access; the report locks again. */
  onDisconnect: () => void;
  onRetryAccess: () => void;
  onSwitchNetwork: () => void;
  onCopyLink: () => void;
  onOpenInBrowser: () => void;
};

export type AccessPanelProps = AccessControls & {
  priceUsdc: string | null;
};

export type AccessStatusProps = Omit<AccessControls, 'onConnect'> & {
  /** `report`: under a result. `check`: inside the 402 "needs payment" message. */
  context: 'report' | 'check';
};
