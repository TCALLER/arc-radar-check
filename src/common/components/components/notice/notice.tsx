import { cva, type VariantProps } from 'class-variance-authority';

import { Alert, AlertDescription, AlertTitle } from '@/common/components/ui/alert';
import { cn } from '@/common/utils/global-utility';

import type { ReactNode } from 'react';

const noticeVariants = cva(
  'flex flex-col gap-2.5 rounded-2xl border-0 p-4 text-base text-ink sm:flex-row sm:items-center',
  {
    variants: {
      tone: {
        caution: 'bg-caution-tint [&_[data-slot=alert-title]]:text-caution-ink',
        danger: 'bg-danger-tint [&_[data-slot=alert-title]]:text-danger',
        neutral: 'bg-inset',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

type NoticeProps = VariantProps<typeof noticeVariants> & {
  title: ReactNode;
  children?: ReactNode;
  /** A button or link, shown beside (desktop) or below (phone) the text. */
  action?: ReactNode;
  /** `alert` for problems the user must notice now; `status` for calmer updates. */
  role?: 'alert' | 'status';
  className?: string;
};

/** Inline message such as "Your wallet is on another network". */
export function Notice({ tone, title, children, action, role = 'alert', className }: NoticeProps) {
  return (
    <Alert role={role} className={cn(noticeVariants({ tone }), className)}>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <AlertTitle className="text-base font-extrabold">{title}</AlertTitle>
        {children && (
          <AlertDescription className="text-[15px] text-ink">{children}</AlertDescription>
        )}
      </div>
      {action}
    </Alert>
  );
}
