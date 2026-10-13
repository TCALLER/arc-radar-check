import { Bar } from '@/common/components/components/bar';
import { HelpToggle } from '@/common/components/components/help-toggle';
import { ReportSection } from '@/common/components/components/report-sheet';
import { SafeText } from '@/common/components/components/safe-text';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/common/components/components/table';
import { formatDate } from '@/common/utils/date-utility';
import { toSafeDisplayText } from '@/common/utils/global-utility';

import {
  describeBurns,
  describeClaim,
  formatIntegerString,
  hasBurnBar,
  shortenAddress,
} from '../functions';

import { ClaimLine } from './claim-line';

import type { CheckOk } from '../schema';

export function BurnsSection({ burns }: { burns: CheckOk['burns'] }) {
  if (!burns) return null;
  const claim = describeClaim(burns);
  const isNothingBurned = burns.burned_pct_of_supply === 0;

  return (
    <ReportSection title="Burns">
      <ClaimLine text={claim.text} tone={claim.tone} />
      <SafeText value={describeBurns(burns)} />
      {hasBurnBar(burns) && (
        // Decorative: the sentence above carries the facts. Never shows a "remaining" amount.
        <div aria-hidden className="flex flex-col gap-1.5">
          <Bar variant="burn" value={burns.burned_pct_of_supply} />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{isNothingBurned ? 'Nothing burned on-chain' : 'Burned'}</span>
            <span>Total supply</span>
          </div>
        </div>
      )}
      {burns.events.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Transaction</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {burns.events.map((event, index) => (
              <TableRow key={`${event.tx_hash}-${index}`}>
                <TableCell>
                  <SafeText value={formatDate(event.timestamp)} />
                </TableCell>
                <TableCell>
                  <SafeText value={formatIntegerString(event.amount)} mono />
                </TableCell>
                <TableCell>
                  <SafeText value={shortenAddress(toSafeDisplayText(event.tx_hash).text)} mono />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {hasBurnBar(burns) && (
        <HelpToggle>
          <p>
            A burn sends tokens to an address no one can spend from. Verified means it was found
            on-chain.
          </p>
        </HelpToggle>
      )}
    </ReportSection>
  );
}
