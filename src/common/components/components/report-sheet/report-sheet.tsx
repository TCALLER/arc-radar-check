import { Card } from '@/common/components/ui/card';
import { cn } from '@/common/utils/global-utility';

import type { ReactNode } from 'react';

type ReportSheetProps = {
  children: ReactNode;
  className?: string;
  /** Names the sheet for screen readers (rendered as a labelled region). */
  'aria-label'?: string;
};

/**
 * The report as one sheet rising from below: 28px top corners on phones,
 * 24/16/40px padding, 28px between sections. Fully rounded beside the radar on desktop.
 */
export function ReportSheet({ children, className, ...props }: ReportSheetProps) {
  return (
    <Card
      {...props}
      role={props['aria-label'] ? 'region' : undefined}
      className={cn(
        'gap-7 rounded-t-sheet rounded-b-none bg-sheet px-4 pt-6 pb-10 text-base text-ink ring-0',
        'lg:rounded-b-sheet lg:px-8 lg:pt-8',
        className,
      )}
    >
      {children}
    </Card>
  );
}

type ReportSectionProps = {
  title: ReactNode;
  /** Small text or control on the right of the heading. */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** One section of the report sheet with its heading. */
export function ReportSection({ title, aside, children, className }: ReportSectionProps) {
  return (
    <section className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-lg font-extrabold">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}
