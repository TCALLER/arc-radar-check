import { CircleCheck, CircleMinus, TriangleAlert } from 'lucide-react';

import { cn } from '@/common/utils/global-utility';

import type { ClaimTone } from '../types';

const ICONS = { ok: CircleCheck, caution: TriangleAlert, muted: CircleMinus } as const;
const TONE_CLASSES: Record<ClaimTone, string> = {
  ok: 'text-ok',
  caution: 'text-caution',
  muted: 'text-muted-foreground',
};

/** "Claimed and verified on-chain" style status line with an icon (not colour alone). */
export function ClaimLine({ text, tone }: { text: string; tone: ClaimTone }) {
  const Icon = ICONS[tone];
  return (
    <p className={cn('flex items-center gap-2 font-bold', TONE_CLASSES[tone])}>
      <Icon aria-hidden className="size-5 shrink-0" />
      <span>{text}</span>
    </p>
  );
}
