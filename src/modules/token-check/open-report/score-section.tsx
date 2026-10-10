import { ReportSection } from '@/common/components/components/report-sheet';
import { SafeText } from '@/common/components/components/safe-text';

import type { CheckOk } from '../schema';

export function ScoreSection({ verdict }: { verdict: CheckOk['verdict'] }) {
  if (verdict.score === undefined && !verdict.headline) return null;
  return (
    <ReportSection title="Safety score">
      {verdict.score !== undefined && (
        <p className="flex items-baseline gap-2">
          <SafeText value={String(verdict.score)} lines={1} className="text-4xl font-extrabold" />
          <span className="text-muted-foreground">out of 100</span>
        </p>
      )}
      {verdict.headline && <SafeText value={verdict.headline} />}
    </ReportSection>
  );
}
