import { ChevronDown } from 'lucide-react';

import { Button } from '@/common/components/components/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/common/components/ui/collapsible';

import type { ReactNode } from 'react';

type HelpToggleProps = {
  /** Neutral, general definitions only: never facts or advice about the token. */
  children: ReactNode;
  label?: string;
};

/** "What does this mean?" toggle. Its content is marked as general help, not part of the report. */
export function HelpToggle({ children, label = 'What does this mean?' }: HelpToggleProps) {
  return (
    <Collapsible className="group/help flex flex-col gap-2">
      <CollapsibleTrigger asChild>
        <Button
          variant="link"
          className="w-fit gap-1 text-[15px] text-link no-underline hover:underline"
        >
          {label}
          <ChevronDown
            aria-hidden
            className="size-4 transition-transform group-data-[state=open]/help:rotate-180"
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-1 rounded-xl bg-inset p-3 text-[15px]">
        <p className="text-sm text-muted-foreground">General help, not part of this report</p>
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
