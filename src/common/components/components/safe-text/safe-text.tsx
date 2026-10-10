'use client';

import { Button } from '@/common/components/components/button';
import { cn } from '@/common/utils/global-utility';

import { useSafeText } from './use-safe-text';

type SafeTextProps = {
  /** Untrusted text from the API or Telegram. Rendered only as a React text node. */
  value: string | null | undefined;
  /** Shown (muted) when the value is empty after cleaning, e.g. "Unlabelled". */
  fallback?: string;
  /** Lines before cutting off with an ellipsis. Omit to wrap freely (long words still break). */
  lines?: 1 | 2;
  /** Extra visible toggle under cut-off text, e.g. "Show full name". */
  expandLabel?: string;
  mono?: boolean;
  /** Flows inside a sentence or label (e.g. a number in "Pay 0.50 USDC"). Wraps anywhere, never cut off. */
  inline?: boolean;
  className?: string;
};

/**
 * The only way untrusted strings reach the screen: hidden and text-direction
 * characters stripped, isolated in <bdi>, cut off without breaking the layout, and the full
 * value available on hover (title) and on tap or Enter (expands in place).
 */
export function SafeText({
  value,
  fallback,
  lines,
  expandLabel,
  mono = false,
  inline = false,
  className,
}: SafeTextProps) {
  const { text, isFallback, isTruncated, isExpanded, toggleExpanded, textRef } = useSafeText({
    value,
    fallback,
  });

  if (inline) {
    return (
      <span
        ref={textRef}
        className={cn(
          'wrap-anywhere',
          isFallback && 'text-muted-foreground',
          mono && 'font-mono',
          className,
        )}
      >
        <bdi>{text}</bdi>
      </span>
    );
  }

  const textClassName = cn(
    'block min-w-0 wrap-anywhere',
    !isExpanded && lines === 1 && 'truncate',
    !isExpanded && lines === 2 && 'line-clamp-2',
    isFallback && 'text-muted-foreground',
    mono && 'font-mono',
  );

  const content = (
    <span ref={textRef} title={lines ? text : undefined} className={textClassName}>
      <bdi>{text}</bdi>
    </span>
  );

  if (!lines || (!isTruncated && !isExpanded)) {
    return <span className={cn('block min-w-0', className)}>{content}</span>;
  }

  return (
    <span className={cn('flex min-w-0 flex-col items-start gap-1', className)}>
      <Button
        variant="inline"
        // size="auto": the text keeps its own size (the default button size would force 17px).
        size="auto"
        aria-expanded={isExpanded}
        onClick={toggleExpanded}
        className="font-[inherit] text-inherit"
      >
        {content}
      </Button>
      {expandLabel && (
        <Button
          variant="link"
          aria-hidden
          tabIndex={-1}
          onClick={toggleExpanded}
          className="text-sm"
        >
          {isExpanded ? 'Show less' : expandLabel}
        </Button>
      )}
    </span>
  );
}
