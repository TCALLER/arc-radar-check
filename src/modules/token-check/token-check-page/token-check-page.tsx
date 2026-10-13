'use client';

import { ReportSheet } from '@/common/components/components/report-sheet';
import { cn } from '@/common/utils/global-utility';

import { AccessPanel } from '../access-panel';
import { CheckForm } from '../check-form';
import { SHEET_RISE_DELAY_CLASSES } from '../constants';
import { OpenReport } from '../open-report';
import { PageHeader } from '../page-header';
import { ResultSummary } from '../result-summary';
import { ScanPanel } from '../scan-panel';

import { useTokenCheckPage } from './use-token-check-page';

/** The one page: check form, radar, free preview and the report sheet. */
export function TokenCheckPage() {
  const {
    checkView,
    accessControls,
    lockedPriceUsdc,
    isUnlocked,
    announcement,
    timelineIndex,
    dataBadge,
    isTelegram,
    telegramName,
    submittedAddress,
    formKey,
    initialInput,
    handleSubmit,
    handleRetry,
    handleTryAnother,
  } = useTokenCheckPage();
  const result = checkView.kind === 'result' ? checkView.data : null;

  return (
    <div className="flex min-h-full flex-1 flex-col telegram-safe-area">
      {/* One polite live region for the scan and its result; errors use role="alert". */}
      <p role="status" className="sr-only">
        {announcement}
      </p>
      <PageHeader dataBadge={dataBadge} isTelegram={isTelegram} telegramName={telegramName} />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col lg:grid lg:max-w-[1280px] lg:grid-cols-[420px_minmax(0,1fr)] lg:items-start lg:gap-10 lg:px-8 lg:pt-2 lg:pb-12">
        <div className="flex flex-col gap-7 px-4 pt-2 lg:px-0">
          <CheckForm
            key={formKey}
            checkedAddress={result ? submittedAddress : null}
            isScanning={checkView.kind === 'scanning'}
            onSubmit={handleSubmit}
            initialValue={initialInput}
            autoFocus={formKey > 0}
          />
          {result && <ResultSummary data={result} isUnlocked={isUnlocked} />}
        </div>

        {checkView.kind === 'result' ? (
          <ReportSheet
            aria-label="Full report"
            className={cn(
              'mt-6 motion-safe:animate-rise lg:mt-0 lg:ring-1 lg:ring-line',
              SHEET_RISE_DELAY_CLASSES[timelineIndex],
            )}
          >
            <AccessPanel {...accessControls} priceUsdc={lockedPriceUsdc} />
            {isUnlocked && <OpenReport data={checkView.data} />}
          </ReportSheet>
        ) : (
          <div className="px-4 pt-7 pb-10 lg:p-0">
            <ScanPanel
              view={checkView}
              onRetry={handleRetry}
              onTryAnother={handleTryAnother}
              access={accessControls}
            />
          </div>
        )}
      </main>
    </div>
  );
}
