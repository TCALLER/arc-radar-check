import { Bar } from '@/common/components/components/bar';
import { EmptyState } from '@/common/components/components/empty-state';
import { HelpToggle } from '@/common/components/components/help-toggle';
import { ReportSection } from '@/common/components/components/report-sheet';
import { SafeText } from '@/common/components/components/safe-text';
import { toSafeDisplayText } from '@/common/utils/global-utility';

import { UNLABELLED } from '../constants';
import {
  countCleanedLabels,
  describeCleanedLabels,
  formatCount,
  formatPercent,
  pluralize,
  shortenAddress,
} from '../functions';

import type { CheckOk } from '../schema';

/** Who holds it. Bars are always neutral ink: the API gives no threshold. */
export function HoldersSection({ holders }: { holders: CheckOk['holders'] }) {
  const topHolders = holders.top_holders ?? [];
  const cleanedNote = describeCleanedLabels(countCleanedLabels(topHolders));

  return (
    <ReportSection
      title="Who holds it"
      aside={
        <span className="text-sm text-muted-foreground">
          <SafeText value={formatCount(holders.count)} inline />{' '}
          {pluralize(holders.count, 'wallet', 'wallets')}
        </span>
      }
    >
      {holders.top10_share_pct === undefined && topHolders.length === 0 ? (
        <EmptyState message="No holder breakdown in this report." />
      ) : (
        <>
          {holders.top10_share_pct !== undefined && (
            <div className="flex flex-col gap-2">
              <p>
                The top 10 wallets hold{' '}
                <SafeText
                  value={formatPercent(holders.top10_share_pct)}
                  inline
                  className="font-bold"
                />{' '}
                of all tokens.
              </p>
              <Bar
                value={holders.top10_share_pct}
                label={`Top 10 wallets hold ${formatPercent(holders.top10_share_pct)}`}
              />
            </div>
          )}
          {topHolders.length > 0 && (
            <ul className="flex flex-col gap-3 rounded-2xl bg-inset p-4">
              {topHolders.map((holder, index) => {
                const shortAddress = shortenAddress(toSafeDisplayText(holder.address).text);
                const share = formatPercent(holder.share_pct);
                return (
                  <li key={`${holder.address}-${index}`} className="flex flex-col gap-1.5">
                    <div className="flex items-baseline gap-2">
                      <SafeText
                        value={holder.label}
                        fallback={UNLABELLED}
                        lines={1}
                        className="min-w-0 flex-1 font-semibold"
                      />
                      <SafeText
                        value={shortAddress}
                        mono
                        className="shrink-0 text-sm text-muted-foreground"
                      />
                      <SafeText
                        value={share}
                        lines={1}
                        className="w-14 shrink-0 text-right font-bold"
                      />
                    </div>
                    <Bar value={holder.share_pct} label={`Wallet ${shortAddress} holds ${share}`} />
                  </li>
                );
              })}
            </ul>
          )}
          {cleanedNote && <p className="text-sm text-muted-foreground">{cleanedNote}</p>}
          <HelpToggle>
            <p>
              The top 10 share is what the ten largest wallets hold together. A label says what a
              wallet is.
            </p>
          </HelpToggle>
        </>
      )}
    </ReportSection>
  );
}
