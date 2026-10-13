import { cn } from '@/common/utils/global-utility';

/** The "or" between Connect wallet and Pay: either way unlocks (stacked on phones, inline on web). */
export function OrDivider({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'text-center text-sm text-muted-foreground lg:flex lg:h-14 lg:items-center',
        className,
      )}
    >
      or
    </span>
  );
}
