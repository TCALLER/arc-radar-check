import { Lock } from 'lucide-react';

import { LOCKED_SECTION_NAMES } from '../constants';

/** Phones: the names of the locked sections. No locked data is ever rendered. */
export function LockedSectionList() {
  return (
    <ul className="flex flex-wrap gap-2 lg:hidden">
      {LOCKED_SECTION_NAMES.map((name) => (
        <li
          key={name}
          className="flex items-center gap-1.5 rounded-full bg-inset px-3 py-1.5 text-sm"
        >
          <Lock aria-hidden className="size-3.5 text-muted-foreground" />
          {name}
        </li>
      ))}
    </ul>
  );
}

/** Web: a faint outline of the report (names + placeholder bars). Decorative; holds no data. */
export function LockedReportOutline() {
  return (
    <div aria-hidden className="hidden grid-cols-2 gap-x-8 gap-y-6 pt-2 lg:grid">
      {LOCKED_SECTION_NAMES.map((name) => (
        <div key={name} className="flex flex-col gap-2.5">
          <span className="flex items-center gap-2 font-bold text-muted-foreground">
            <Lock className="size-4" />
            {name}
          </span>
          <span className="h-3 w-full rounded-full bg-track opacity-75" />
          <span className="h-3 w-2/3 rounded-full bg-track opacity-75" />
        </div>
      ))}
    </div>
  );
}
