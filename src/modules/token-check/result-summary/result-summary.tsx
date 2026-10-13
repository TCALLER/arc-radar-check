import { CircleCheck, CircleHelp, OctagonX, TriangleAlert } from 'lucide-react';

import { RadarScope, type BlipTone } from '@/common/components/components/radar-scope';
import { SafeText } from '@/common/components/components/safe-text';
import { cn } from '@/common/utils/global-utility';

import { VERDICT_LABELS, VERDICT_SETTLE_DELAY_CLASSES } from '../constants';
import { formatCount, hasCodeLikeText, pluralize, toTimelineIndex } from '../functions';
import { VerdictLevel, type CheckOk } from '../schema';

// Safety message: metadata that looks like code is displayed, never run.
export const CODE_LIKE_NOTE = 'Shown as text only. Nothing in it runs.';

const VERDICT_ICONS = {
  [VerdictLevel.Ok]: CircleCheck,
  [VerdictLevel.Caution]: TriangleAlert,
  [VerdictLevel.Danger]: OctagonX,
  [VerdictLevel.Unknown]: CircleHelp,
} as const;

const VERDICT_COLORS: Record<VerdictLevel, string> = {
  [VerdictLevel.Ok]: 'text-ok',
  [VerdictLevel.Caution]: 'text-caution',
  [VerdictLevel.Danger]: 'text-danger',
  [VerdictLevel.Unknown]: 'text-muted-foreground',
};

type ResultSummaryProps = {
  data: CheckOk;
  isUnlocked: boolean;
};

/**
 * The free preview: radar with one blip per warning sign, the verdict word, the token and
 * one facts sentence. Blips are neutral until the report is unlocked.
 */
export function ResultSummary({ data, isUnlocked }: ResultSummaryProps) {
  const level = data.verdict.level;
  const Icon = VERDICT_ICONS[level];
  const flagCount = data.risk_flags.length;
  const blips: BlipTone[] = data.risk_flags.map((flag) => (isUnlocked ? flag.severity : 'neutral'));

  return (
    <section aria-label="Result" className="flex flex-col items-center gap-3.5 text-center">
      <RadarScope state="blips" blips={blips} size="phone" className="lg:size-75" />
      <div
        className={cn(
          'flex w-full max-w-full flex-col items-center gap-1.5 motion-safe:animate-settle',
          VERDICT_SETTLE_DELAY_CLASSES[toTimelineIndex(flagCount)],
        )}
      >
        <p className={cn('flex items-center gap-2.5', VERDICT_COLORS[level])}>
          <Icon aria-hidden className="size-7 shrink-0 lg:size-8" strokeWidth={2.2} />
          <span className="text-[32px] leading-tight font-extrabold tracking-tight lg:text-4xl">
            {VERDICT_LABELS[level]}
          </span>
        </p>
        <div className="flex max-w-full min-w-0 items-baseline justify-center gap-1.5 text-base lg:text-[17px]">
          <SafeText
            value={data.token.name}
            lines={1}
            expandLabel="Show full token name"
            className="min-w-0 font-semibold"
          />
          <span className="flex max-w-[45%] min-w-0 text-muted-foreground">
            (<SafeText value={data.token.symbol} lines={1} className="min-w-0" />)
          </span>
        </div>
        {hasCodeLikeText(data.token.name, data.token.symbol) && (
          <p className="text-sm text-muted-foreground">{CODE_LIKE_NOTE}</p>
        )}
        <p className="text-[15px] text-muted-foreground lg:text-base">
          <b className="font-semibold text-ink">{flagCount === 0 ? 'No' : flagCount}</b>{' '}
          {pluralize(flagCount, 'warning sign', 'warning signs')} found.{' '}
          <SafeText
            value={formatCount(data.holders.count)}
            inline
            className="font-semibold text-ink"
          />{' '}
          {pluralize(data.holders.count, 'wallet holds', 'wallets hold')} it.
        </p>
      </div>
    </section>
  );
}
