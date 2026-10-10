import { cn } from '@/common/utils/global-utility';

/** A successful response with nothing to list, e.g. "No warning signs in this report." */
export function EmptyState({ message, className }: { message: string; className?: string }) {
  return (
    <p className={cn('rounded-xl bg-inset px-4 py-3 text-muted-foreground', className)}>
      {message}
    </p>
  );
}
