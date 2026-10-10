import { CircleCheck } from 'lucide-react';

import { Button } from '@/common/components/components/button';
import { Notice } from '@/common/components/components/notice';

import { WalletRow } from '../wallet-row';

import { NoWalletHelp } from './no-wallet-help';

import type { AccessStatusProps } from './types';

const SLOW_WALLET_HINT = 'Nothing in your wallet? Open it, or cancel and try again.';

const COPY = {
  report: {
    holder: 'Free for holders. Your full report is open.',
    notHolder: "This wallet doesn't hold our token. Pay to unlock the full report.",
    stillLocked: 'Retry, or pay to unlock the report.',
  },
  check: {
    // The server still asked for payment, so nothing is unlocked here.
    holder: 'Your wallet holds our token, but this check still asks for payment.',
    notHolder: "This wallet doesn't hold our token. Pay for this check.",
    stillLocked: 'Retry, or pay for this check.',
  },
} as const;

/**
 * The wallet and holder-check feedback, shared by the locked
 * report and the 402 "needs payment" message. Shows only what the server's access answer says.
 */
export function AccessStatus({
  context,
  state,
  wallet,
  noWalletPlatform,
  isLinkCopied,
  manualCopyUrl,
  walletMessage,
  isSwitchingNetwork,
  isWalletSlow,
  onCancelWalletRequest,
  onDisconnect,
  onRetryAccess,
  onSwitchNetwork,
  onCopyLink,
  onOpenInBrowser,
}: AccessStatusProps) {
  const copy = COPY[context];
  // Holder status is about the address, so it's checked on any network; the balance needs Arc.
  const isWrongNetwork = state === 'wrongNet' || (wallet !== null && !wallet.isOnArc);

  return (
    <div className="flex w-full flex-col gap-3 text-left">
      {state === 'holder' &&
        (context === 'report' ? (
          <p role="status" className="flex items-center gap-2.5 font-bold text-ok">
            <CircleCheck aria-hidden className="size-5 shrink-0" />
            {copy.holder}
          </p>
        ) : (
          <p role="status" className="text-muted-foreground lg:text-panel-muted">
            {copy.holder}
          </p>
        ))}

      {state === 'connecting' && (
        <p
          role="status"
          className="flex h-14 items-center justify-center rounded-xl bg-inset font-bold motion-safe:animate-pulse-soft lg:max-w-90"
        >
          Confirm in your wallet…
        </p>
      )}
      {(state === 'connecting' || isSwitchingNetwork) && isWalletSlow && (
        <div role="status" className="flex flex-col items-start gap-1">
          <p className="text-[15px] text-muted-foreground">{SLOW_WALLET_HINT}</p>
          <Button variant="link" onClick={onCancelWalletRequest}>
            Cancel
          </Button>
        </div>
      )}

      {wallet && <WalletRow wallet={wallet} onDisconnect={onDisconnect} />}

      {state === 'checking' && (
        <p role="status" className="text-muted-foreground motion-safe:animate-pulse-soft">
          Checking if this wallet holds our token…
        </p>
      )}
      {state === 'notHolder' && <p className="text-muted-foreground">{copy.notHolder}</p>}
      {state === 'failed' && (
        <Notice
          tone="danger"
          title="Couldn't check if this wallet holds our token"
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={onRetryAccess}
              className="border-danger text-danger"
            >
              Retry
            </Button>
          }
        >
          {copy.stillLocked}
        </Notice>
      )}
      {isWrongNetwork && (
        <Notice
          tone="caution"
          title="Your wallet is on another network"
          action={
            <Button
              size="md"
              onClick={onSwitchNetwork}
              disabled={isSwitchingNetwork}
              className={isSwitchingNetwork ? 'motion-safe:animate-pulse-soft' : undefined}
            >
              {isSwitchingNetwork ? 'Confirm in your wallet…' : 'Switch to Arc mainnet'}
            </Button>
          }
        >
          Switch to Arc mainnet to see your USDC balance.
        </Notice>
      )}
      {state === 'noWallet' && (
        <NoWalletHelp
          platform={noWalletPlatform}
          isLinkCopied={isLinkCopied}
          manualCopyUrl={manualCopyUrl}
          onCopyLink={onCopyLink}
          onOpenInBrowser={onOpenInBrowser}
        />
      )}
      {walletMessage && (
        <p role="status" className="text-[15px] text-muted-foreground">
          {walletMessage}
        </p>
      )}
    </div>
  );
}
