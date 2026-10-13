import { ReportSection } from '@/common/components/components/report-sheet';
import { SafeText } from '@/common/components/components/safe-text';
import { formatDateTime } from '@/common/utils/date-utility';

import { formatIntegerString } from '../functions';

import type { CheckOk } from '../schema';

type Row = { label: string; value: string; mono?: boolean };

/** Token facts. Total supply is shown exactly as the API string, never scaled. */
export function TokenDetailsSection({ data }: { data: CheckOk }) {
  const rows: Row[] = [];
  if (data.token.total_supply !== undefined) {
    rows.push({
      label: 'Total supply',
      value: formatIntegerString(data.token.total_supply),
      mono: true,
    });
  }
  if (data.token.decimals !== undefined) {
    rows.push({ label: 'Decimals', value: String(data.token.decimals), mono: true });
  }
  if (data.chain) {
    rows.push({
      label: 'Network',
      value: `${data.chain.name}, chain ${data.chain.chain_id}`,
    });
  }
  if (data.checked_at) {
    rows.push({ label: 'Checked', value: formatDateTime(data.checked_at) });
  }
  if (rows.length === 0) return null;

  return (
    <ReportSection title="Token details">
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2.5 rounded-2xl bg-inset p-4">
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="min-w-0">
              <SafeText value={row.value} mono={row.mono} />
            </dd>
          </div>
        ))}
      </dl>
    </ReportSection>
  );
}
