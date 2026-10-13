import { Badge } from '@/common/components/components/badge';
import { EmptyState } from '@/common/components/components/empty-state';
import { ReportSection } from '@/common/components/components/report-sheet';
import { SafeText } from '@/common/components/components/safe-text';
import { cn } from '@/common/utils/global-utility';

import { SEVERITY_BADGE_TONES, SEVERITY_LABELS } from '../constants';
import { Severity, type RiskFlag } from '../schema';

const CARD_TINTS: Record<Severity, string> = {
  [Severity.High]: 'bg-danger-tint',
  [Severity.Medium]: 'bg-caution-tint',
  [Severity.Low]: 'bg-inset',
  [Severity.Info]: 'bg-inset',
};

/** Risk flags in the API's order. The code is the key only, never shown. */
export function WarningSignsSection({ flags }: { flags: readonly RiskFlag[] }) {
  return (
    <ReportSection title="Warning signs">
      {flags.length === 0 ? (
        <EmptyState message="No warning signs in this report." />
      ) : (
        <ul className="flex flex-col gap-3">
          {flags.map((flag, index) => (
            <li
              key={`${flag.code}-${index}`}
              className={cn(
                'flex flex-col items-start gap-1.5 rounded-2xl p-4',
                CARD_TINTS[flag.severity],
              )}
            >
              {/* A plain label on the tinted card: no pill corners, which would clip the first letter */}
              <Badge
                tone={SEVERITY_BADGE_TONES[flag.severity]}
                className="rounded-none border-0 bg-transparent px-0 py-0"
              >
                {SEVERITY_LABELS[flag.severity]}
              </Badge>
              <SafeText value={flag.title} className="font-bold" />
              <SafeText value={flag.explanation} className="text-[15px]" />
            </li>
          ))}
        </ul>
      )}
    </ReportSection>
  );
}
