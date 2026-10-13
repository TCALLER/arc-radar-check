import { BurnsSection } from './burns-section';
import { BuybacksSection } from './buybacks-section';
import { HoldersSection } from './holders-section';
import { ScoreSection } from './score-section';
import { SourcesSection } from './sources-section';
import { SummarySection } from './summary-section';
import { TokenDetailsSection } from './token-details-section';
import { WarningSignsSection } from './warning-signs-section';

import type { CheckOk } from '../schema';

/** The full report, rendered only once the server unlocked it. */
export function OpenReport({ data }: { data: CheckOk }) {
  return (
    <div className="flex flex-col gap-7 motion-safe:animate-rise">
      <ScoreSection verdict={data.verdict} />
      <SummarySection summary={data.summary} />
      <WarningSignsSection flags={data.risk_flags} />
      <HoldersSection holders={data.holders} />
      <BurnsSection burns={data.burns} />
      <BuybacksSection buybacks={data.buybacks} />
      <TokenDetailsSection data={data} />
      <SourcesSection sources={data.sources} />
    </div>
  );
}
