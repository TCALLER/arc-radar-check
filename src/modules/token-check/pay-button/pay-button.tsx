import { Button } from '@/common/components/components/button';
import { SafeText } from '@/common/components/components/safe-text';
import { cn } from '@/common/utils/global-utility';

type PayButtonProps = {
  /** From `payment.price_usdc` in a 402 response. Never hardcoded. */
  priceUsdc: string | null;
  className?: string;
  noteClassName?: string;
};

// One Pay button is on screen at a time (locked report or 402).
const NOTE_ID = 'pay-note';

/**
 * Placeholder for the client's x402 payment flow. It performs no payment.
 * TODO(x402): the client's flow plugs in here; on success it must signal "payment completed"
 * so the report unlocks (see `isUnlocked` in use-token-check-page.ts).
 */
export function PayButton({ priceUsdc, className, noteClassName }: PayButtonProps) {
  return (
    <div className="flex flex-col items-stretch gap-1.5 lg:items-start">
      <Button
        variant="outline"
        disabled
        aria-describedby={NOTE_ID}
        className={cn('w-full lg:w-auto', className)}
      >
        {priceUsdc ? (
          <>
            Pay <SafeText value={priceUsdc} inline /> USDC
          </>
        ) : (
          'Pay per check'
        )}
      </Button>
      <span
        id={NOTE_ID}
        className={cn('text-center text-sm text-muted-foreground lg:text-left', noteClassName)}
      >
        Payment is coming soon.
      </span>
    </div>
  );
}
