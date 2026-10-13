import { ReportSection } from '@/common/components/components/report-sheet';
import { SafeText } from '@/common/components/components/safe-text';

import { describeBuybackNote, describeClaim } from '../functions';

import { ClaimLine } from './claim-line';

import type { CheckOk } from '../schema';

export function BuybacksSection({ buybacks }: { buybacks: CheckOk['buybacks'] }) {
  if (!buybacks) return null;
  const claim = describeClaim(buybacks);
  const note = describeBuybackNote(buybacks);
  return (
    <ReportSection title="Buybacks">
      <ClaimLine text={claim.text} tone={claim.tone} />
      {note !== null && <SafeText value={note} />}
    </ReportSection>
  );
}
