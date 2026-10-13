import { Progress } from '@/common/components/ui/progress';
import { cn } from '@/common/utils/global-utility';

type BarProps = {
  /** Percentage 0–100, drawn at its true width. */
  value: number;
  /** `neutral`: holder shares, always ink (never coloured as good or bad). `burn`: hatched supply bar. */
  variant?: 'neutral' | 'burn';
  /** Accessible name for neutral bars, e.g. "Wallet 0x2222… holds 21.3%". */
  label?: string;
  className?: string;
};

const MIN_PERCENT = 0;
const MAX_PERCENT = 100;

const clampPercent = (value: number): number =>
  Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, Number.isFinite(value) ? value : MIN_PERCENT));

/**
 * Horizontal bar on shadcn Progress. Any value above 0 shows at least 2px so tiny shares stay
 * visible. The burn variant is decorative (`aria-hidden`); the sentence next to it carries the facts.
 */
export function Bar({ value, variant = 'neutral', label, className }: BarProps) {
  const percent = clampPercent(value);
  const isBurn = variant === 'burn';

  return (
    <Progress
      value={percent}
      // The raw shadcn Progress doesn't forward `value` to Radix, so set the ARIA value here.
      aria-valuenow={percent}
      aria-valuetext={`${percent}%`}
      aria-label={isBurn ? undefined : label}
      aria-hidden={isBurn || undefined}
      className={cn(
        'relative h-2 rounded-full bg-track',
        '*:data-[slot=progress-indicator]:rounded-full',
        isBurn
          ? 'h-3 *:data-[slot=progress-indicator]:burn-indicator'
          : '*:data-[slot=progress-indicator]:bg-bar',
        percent > MIN_PERCENT &&
          !isBurn &&
          'before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:rounded-l-full before:bg-bar',
        isBurn && percent === MIN_PERCENT && 'burn-empty',
        className,
      )}
    />
  );
}
