import {
  Table as UiTable,
  TableBody as UiTableBody,
  TableCell as UiTableCell,
  TableHead as UiTableHead,
  TableHeader as UiTableHeader,
  TableRow as UiTableRow,
} from '@/common/components/ui/table';
import { cn } from '@/common/utils/global-utility';

import type { ComponentProps } from 'react';

/** Data table inside the report sheet (e.g. burn events): inset rows, muted headings. */
export function Table({ className, ...props }: ComponentProps<typeof UiTable>) {
  return <UiTable className={cn('text-[15px]', className)} {...props} />;
}

export function TableHeader(props: ComponentProps<typeof UiTableHeader>) {
  return <UiTableHeader {...props} />;
}

export function TableBody(props: ComponentProps<typeof UiTableBody>) {
  return <UiTableBody {...props} />;
}

export function TableRow({ className, ...props }: ComponentProps<typeof UiTableRow>) {
  return <UiTableRow className={cn('border-line hover:bg-transparent', className)} {...props} />;
}

export function TableHead({ className, ...props }: ComponentProps<typeof UiTableHead>) {
  return (
    <UiTableHead
      className={cn('h-9 px-2 text-sm font-semibold text-muted-foreground first:pl-0', className)}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: ComponentProps<typeof UiTableCell>) {
  return <UiTableCell className={cn('px-2 py-2.5 first:pl-0', className)} {...props} />;
}
