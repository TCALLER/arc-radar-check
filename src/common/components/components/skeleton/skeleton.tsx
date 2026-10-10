import { Skeleton as UiSkeleton } from '@/common/components/ui/skeleton';
import { cn } from '@/common/utils/global-utility';

import type { ComponentProps } from 'react';

/** Placeholder block in the track colour. Decorative, hidden from screen readers. */
export function Skeleton({ className, ...props }: ComponentProps<typeof UiSkeleton>) {
  return <UiSkeleton aria-hidden className={cn('rounded-md bg-track', className)} {...props} />;
}
