import { cva, type VariantProps } from 'class-variance-authority';

import { Badge as UiBadge } from '@/common/components/ui/badge';
import { cn } from '@/common/utils/global-utility';

import type { ComponentProps } from 'react';

const badgeVariants = cva(
  'h-auto rounded-full border-transparent px-2.5 py-1 text-[13px] font-bold',
  {
    variants: {
      tone: {
        // Sample data: filled in light, outlined in dark; the only badge with a border
        sample: 'border-sample-border bg-sample-bg text-caution-ink',
        ok: 'bg-ok-tint text-ok',
        caution: 'bg-caution-tint text-caution-ink',
        danger: 'bg-danger-tint text-danger',
        neutral: 'bg-track text-muted-foreground',
        holder: 'bg-ok-tint text-ok',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>['tone']>;

type BadgeProps = Omit<ComponentProps<typeof UiBadge>, 'variant'> & { tone?: BadgeTone };

/** Pill label. Colour is never the only cue: badges always carry text. */
export function Badge({ tone, className, ...props }: BadgeProps) {
  return (
    <UiBadge variant="outline" className={cn(badgeVariants({ tone }), className)} {...props} />
  );
}
