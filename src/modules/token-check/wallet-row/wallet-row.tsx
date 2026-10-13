import { Button } from '@/common/components/components/button';
import { SafeText } from '@/common/components/components/safe-text';
import { cn } from '@/common/utils/global-utility';

import { shortenAddress } from '../functions';

export type BalanceState = 'loading' | 'ready' | 'error' | 'offArc';

export type WalletSummary = {
  address: string;
  isOnArc: boolean;
  /** Formatted USDC balance (6 decimals), when `balanceState` is `ready`. */
  balance: string | null;
  balanceState: BalanceState;
};

const balanceText = ({ balance, balanceState }: WalletSummary): string => {
  switch (balanceState) {
    case 'ready':
      return balance ?? '–';
    case 'loading':
      return '…';
    case 'error':
      return 'Unavailable';
    case 'offArc':
      return '–';
  }
};

/** Connected wallet: short address, network and USDC balance. Never proof of holding. */
type WalletRowProps = {
  wallet: WalletSummary;
  onDisconnect?: () => void;
};

export function WalletRow({ wallet, onDisconnect }: WalletRowProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3 rounded-2xl bg-wallet-row px-3.5 py-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="font-mono text-[15px]">{shortenAddress(wallet.address)}</span>
          <span
            className={cn(
              'flex items-center gap-1.5 text-sm',
              wallet.isOnArc ? 'text-ok' : 'text-caution',
            )}
          >
            <span aria-hidden className="size-2 rounded-full bg-current" />
            {wallet.isOnArc ? 'Arc mainnet' : 'Another network'}
          </span>
        </div>
        <div className="flex max-w-[55%] min-w-0 flex-col items-end">
          {/* Announces the balance once it loads. */}
          <span aria-live="polite" className="max-w-full min-w-0">
            <SafeText
              value={balanceText(wallet)}
              lines={1}
              className={cn(
                'max-w-full font-mono text-[17px]',
                wallet.balanceState === 'error' && 'font-sans text-[15px] text-muted-foreground',
                wallet.balanceState === 'loading' && 'motion-safe:animate-pulse-soft',
              )}
            />
          </span>
          <span className="text-[13px] text-muted-foreground">
            {wallet.balanceState === 'error' ? "Couldn't read USDC balance" : 'USDC'}
          </span>
        </div>
      </div>
      {onDisconnect && (
        <Button variant="link" onClick={onDisconnect} className="self-end text-sm">
          Disconnect
        </Button>
      )}
    </div>
  );
}
