import { ReportSection } from '@/common/components/components/report-sheet';
import { SafeText } from '@/common/components/components/safe-text';

export function SummarySection({ summary }: { summary: string | undefined }) {
  if (!summary) return null;
  return (
    <ReportSection title="In plain words">
      <SafeText value={summary} className="text-[17px]" />
    </ReportSection>
  );
}
