import { Check, Copy } from 'lucide-react';

import { Button } from '@/common/components/components/button';

import type { NoWalletPlatform } from './types';

type NoWalletHelpProps = {
  platform: NoWalletPlatform;
  isLinkCopied: boolean;
  /** Set when the browser blocked copying: the link is shown to copy by hand. */
  manualCopyUrl?: string | null;
  onCopyLink: () => void;
  onOpenInBrowser: () => void;
};

/** No injected wallet here: what to do next, per platform. No WalletConnect. */
export function NoWalletHelp({
  platform,
  isLinkCopied,
  manualCopyUrl = null,
  onCopyLink,
  onOpenInBrowser,
}: NoWalletHelpProps) {
  const manualCopy = manualCopyUrl && (
    <div className="flex flex-col gap-1.5 text-left">
      <p className="text-sm text-muted-foreground">
        Copying is blocked. Press and hold the link to copy it:
      </p>
      <p className="rounded-xl bg-inset px-3 py-2 font-mono text-sm break-all select-all">
        {manualCopyUrl}
      </p>
    </div>
  );
  const copyLabel = isLinkCopied ? 'Link copied' : 'Copy link';
  const CopyIcon = isLinkCopied ? Check : Copy;

  if (platform === 'desktop') {
    return (
      <div role="status" className="flex flex-col gap-1">
        <p className="font-extrabold">No wallet found in this browser</p>
        <p className="text-[15px] text-muted-foreground">
          Install a browser wallet extension, then reload this page.
        </p>
      </div>
    );
  }

  if (platform === 'telegram') {
    return (
      <div role="status" className="flex flex-col gap-2.5">
        <p className="font-extrabold">Open in browser to connect</p>
        <p className="text-[15px] text-muted-foreground">
          Telegram has no wallet. Open this page in your browser or wallet app.
        </p>
        <Button size="md" onClick={onOpenInBrowser}>
          Open in browser
        </Button>
        <Button variant="link" onClick={onCopyLink} className="self-center">
          {copyLabel}
        </Button>
        {/* Telegram follows the user's own link setting, so "Open in browser" may stay in Telegram. */}
        <p className="text-sm text-muted-foreground">
          Still in Telegram? Tap <b className="font-semibold">⋯</b> and choose{' '}
          <b className="font-semibold">Open in browser</b>.
        </p>
        {manualCopy}
      </div>
    );
  }

  return (
    <div role="status" className="flex flex-col gap-2.5">
      <p className="font-extrabold">Open in your wallet&apos;s browser</p>
      <p className="text-[15px] text-muted-foreground">
        No wallet found. Copy this link and open it in your wallet app&apos;s browser.
      </p>
      <Button size="md" onClick={onCopyLink}>
        <CopyIcon aria-hidden className="motion-safe:animate-in motion-safe:zoom-in-50" />
        {copyLabel}
      </Button>
      {manualCopy}
    </div>
  );
}
