import { Button } from '@/common/components/components/button';

import { LOCKED_SECTION_NAMES } from '../constants';
import { PayButton } from '../pay-button';

import { AccessStatus } from './access-status';
import { LockedReportOutline, LockedSectionList } from './locked-preview';
import { OrDivider } from './or-divider';

import type { AccessPanelProps } from './types';

/**
 * Everything between the free preview and the full report: the locked panel plus the wallet and
 * holder-check states. Only the server's access answer unlocks.
 */
export function AccessPanel({ priceUsdc, onConnect, ...controls }: AccessPanelProps) {
  const { state } = controls;

  if (state === 'holder') {
    return <AccessStatus context="report" {...controls} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-2xl font-extrabold lg:text-[26px]">Full report</h2>
        <span className="text-sm text-muted-foreground">
          {LOCKED_SECTION_NAMES.length} sections locked
        </span>
      </div>

      {state === 'locked' && (
        <>
          <LockedSectionList />
          <p className="text-muted-foreground">
            Free if your wallet holds our token, or pay for this report.
          </p>
        </>
      )}

      <AccessStatus context="report" {...controls} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
        {state === 'locked' && (
          <>
            <Button onClick={onConnect} className="w-full lg:w-auto">
              Connect wallet
            </Button>
            <OrDivider />
          </>
        )}
        {state !== 'connecting' && <PayButton priceUsdc={priceUsdc} className="h-14 text-[17px]" />}
      </div>

      <LockedReportOutline />
    </div>
  );
}
