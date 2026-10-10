import { EmptyState } from '@/common/components/components/empty-state';
import { ReportSection } from '@/common/components/components/report-sheet';
import { SafeLink } from '@/common/components/components/safe-link';

import { SOURCE_FALLBACK_LABEL } from '../constants';

import type { Source } from '../schema';

/** Sources: only exact https URLs become links. */
export function SourcesSection({ sources }: { sources: readonly Source[] | undefined }) {
  if (!sources) return null;
  return (
    <ReportSection title="Sources">
      {sources.length === 0 ? (
        <EmptyState message="No sources in this report." />
      ) : (
        <ul className="flex flex-col gap-3">
          {sources.map((source, index) => (
            <li key={`${source.url}-${index}`} className="min-w-0">
              <SafeLink
                href={source.url}
                label={source.label}
                fallbackLabel={SOURCE_FALLBACK_LABEL}
              />
            </li>
          ))}
        </ul>
      )}
    </ReportSection>
  );
}
