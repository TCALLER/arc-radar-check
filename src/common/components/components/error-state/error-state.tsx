import { Button } from '@/common/components/components/button';

import type { ReactNode } from 'react';

type ErrorStateProps = {
  title: string;
  /** Pass untrusted API messages wrapped in SafeText. */
  description?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
};

/** Shared error and timeout message with an optional retry. */
export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel = 'Try again',
  className,
}: ErrorStateProps) {
  return (
    <div role="alert" className={className}>
      <div className="flex flex-col items-start gap-3">
        <h2 className="text-xl font-extrabold">{title}</h2>
        {description && <div className="text-base text-muted-foreground">{description}</div>}
        {onRetry && (
          <Button variant="outline" size="md" onClick={onRetry}>
            {retryLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
