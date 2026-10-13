import { Input } from '@/common/components/ui/input';
import { Label } from '@/common/components/ui/label';
import { cn } from '@/common/utils/global-utility';

import type { ComponentProps, ReactNode } from 'react';

type TextInputProps = Omit<ComponentProps<typeof Input>, 'id'> & {
  id: string;
  label: string;
  /** Shown below the field and linked with aria-describedby; marks the field invalid. */
  error?: string | null;
  helper?: string;
  /** Controls inside the field on the right, e.g. Paste / Clear. */
  trailing?: ReactNode;
  /** Monospace text, for addresses. */
  mono?: boolean;
  /** Increase to play the 320 ms invalid-input shake again. 0 = no shake. */
  shakeCount?: number;
};

/** Labelled 56px text field with helper and error text. */
export function TextInput({
  id,
  label,
  error,
  helper,
  trailing,
  mono = false,
  shakeCount = 0,
  className,
  ...inputProps
}: TextInputProps) {
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;
  const describedBy = [helper && helperId, error && errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Label htmlFor={id} className="text-base font-bold">
        {label}
      </Label>
      <div
        className={cn(
          'flex h-14 items-center gap-1 rounded-xl border border-line bg-sheet pr-1.5 focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-focus',
          error && 'border-danger',
          shakeCount > 0 &&
            (shakeCount % 2 === 1 ? 'motion-safe:animate-shake' : 'motion-safe:animate-shake-alt'),
        )}
      >
        <Input
          id={id}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
          className={cn(
            'h-full min-w-0 flex-1 rounded-xl border-0 bg-transparent px-4 text-base text-ellipsis text-ink shadow-none focus-visible:ring-0 focus-visible:outline-none aria-invalid:ring-0 dark:bg-transparent',
            mono && 'font-mono',
          )}
          {...inputProps}
        />
        {trailing}
      </div>
      {helper && (
        <p id={helperId} className="text-sm text-muted-foreground">
          {helper}
        </p>
      )}
      <p
        id={errorId}
        aria-live="polite"
        className="text-[15px] font-semibold text-danger empty:hidden"
      >
        {error}
      </p>
    </div>
  );
}
