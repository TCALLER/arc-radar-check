import { Eye, Flame, Users } from 'lucide-react';

import { Button } from '@/common/components/components/button';
import { RadarScope } from '@/common/components/components/radar-scope';
import { SafeText } from '@/common/components/components/safe-text';
import { cn } from '@/common/utils/global-utility';

import { AccessStatus, OrDivider } from '../access-panel';
import { SCAN_TOPICS } from '../constants';
import { PayButton } from '../pay-button';

import type { ScanPanelProps } from './types';

const TOPIC_ICONS = [Eye, Users, Flame] as const;

/**
 * Radar and messages before a result. Phones: on the page background. Web (lg): the hero panel in
 * the scope colour on the right, with the radar at 260px.
 */
export function ScanPanel({ view, onRetry, onTryAnother, access }: ScanPanelProps) {
  const isMessage = view.kind !== 'idle' && view.kind !== 'scanning';
  const radarState = view.kind === 'scanning' ? 'sweep' : isMessage ? 'outline' : 'still';
  // The "connect your wallet to check" line only makes sense before a wallet is connected.
  const hasMessageBody =
    view.kind !== 'payment' || (access.wallet === null && access.state !== 'connecting');

  return (
    <section
      aria-label="Scan"
      className={cn(
        'flex flex-col items-center gap-4 text-center',
        'lg:min-h-[460px] lg:justify-between lg:rounded-sheet lg:bg-panel lg:p-8 lg:text-panel-ink',
        // Inside the hero panel the radar uses the panel's own disc and ring colours.
        'lg:[--outline-ring:var(--panel-ring)] lg:[--scope-ring:var(--panel-ring)] lg:[--scope:var(--panel-disc)]',
        // Text, rows and notices inside the dark panel (402 wallet states) switch to light-on-dark values.
        'lg:[--foreground:var(--panel-ink)] lg:[--ink:var(--panel-ink)] lg:[--link:var(--panel-ink)] lg:[--muted-foreground:var(--panel-muted)]',
        'lg:[--caution-ink:#f0b24e] lg:[--danger:#ff8473] lg:[--inset:rgb(255_255_255/0.08)] lg:[--ok:#5ccb8e] lg:[--wallet-row:rgb(255_255_255/0.08)]',
        'lg:[--caution-tint:rgb(240_178_78/0.14)] lg:[--danger-tint:rgb(255_132_115/0.14)] lg:[--primary-foreground:var(--panel)] lg:[--primary:var(--panel-ink)]',
      )}
    >
      <span aria-hidden className="hidden lg:block" />
      <div className="flex w-full flex-col items-center gap-4">
        <RadarScope
          state={radarState}
          size="phone"
          className={cn('lg:size-65', isMessage && 'size-40 lg:opacity-30')}
        />
        {view.kind === 'idle' && (
          <p className="text-muted-foreground lg:text-panel-muted">Waiting for an address</p>
        )}
        {view.kind === 'scanning' && (
          <p className="text-muted-foreground lg:text-panel-muted">Scanning Arc…</p>
        )}
        {isMessage && (
          <div
            role="alert"
            className="flex w-full max-w-[36ch] flex-col items-center gap-2 motion-safe:animate-in motion-safe:duration-250 motion-safe:fade-in"
          >
            <h2 className="text-2xl font-extrabold">{MESSAGES[view.kind].title}</h2>
            {hasMessageBody && (
              <div className="text-muted-foreground lg:text-panel-muted">
                {view.kind === 'apiError' ? (
                  <SafeText value={view.message} />
                ) : (
                  MESSAGES[view.kind].body
                )}
              </div>
            )}
            {view.kind === 'payment' ? (
              <div className="mt-2 flex w-full flex-col items-center gap-3">
                {(access.state !== 'locked' || access.walletMessage) && (
                  <AccessStatus context="check" {...access} />
                )}
                <div className="flex w-full flex-col gap-3 lg:flex-row lg:justify-center">
                  {access.state === 'locked' && (
                    <>
                      <Button size="md" onClick={access.onConnect} className="w-full lg:w-auto">
                        Connect wallet
                      </Button>
                      <OrDivider className="lg:h-13 lg:text-panel-muted" />
                    </>
                  )}
                  {access.state !== 'connecting' && (
                    <PayButton
                      priceUsdc={view.priceUsdc}
                      className="h-13 lg:border-panel-ink lg:text-panel-ink"
                      noteClassName="lg:text-panel-muted"
                    />
                  )}
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                size="md"
                onClick={view.kind === 'apiError' ? onTryAnother : onRetry}
                className="mt-2 lg:border-panel-ink lg:text-panel-ink lg:hover:bg-transparent"
              >
                {view.kind === 'apiError' ? 'Try another address' : 'Try again'}
              </Button>
            )}
          </div>
        )}
      </div>
      <div className="hidden flex-col items-center gap-3 lg:flex">
        <span className="text-[15px] text-panel-muted">Each scan looks at</span>
        <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 font-bold">
          {SCAN_TOPICS.map((topic, index) => {
            const Icon = TOPIC_ICONS[index] ?? Eye;
            return (
              <li key={topic} className="flex items-center gap-2 whitespace-nowrap">
                <Icon aria-hidden className="size-5" />
                {topic}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

const MESSAGES = {
  apiError: { title: "This check didn't work", body: '' },
  timeout: { title: 'The check took too long', body: 'Check your connection, then try again.' },
  failed: {
    title: "This check didn't work",
    body: 'Something went wrong while checking. Try again in a moment.',
  },
  payment: {
    title: 'This check needs payment',
    body: 'Free if your wallet holds our token, or pay for this check.',
  },
} as const;
