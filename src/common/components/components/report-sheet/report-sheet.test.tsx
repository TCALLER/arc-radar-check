import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ReportSection, ReportSheet } from './report-sheet';

describe('ReportSheet', () => {
  it('renders sections with headings', () => {
    render(
      <ReportSheet>
        <ReportSection title="Who holds it" aside={<span>1,284 wallets</span>}>
          <p>Top 10 wallets hold 58.4%.</p>
        </ReportSection>
      </ReportSheet>,
    );

    expect(screen.getByRole('heading', { level: 3, name: 'Who holds it' })).toBeInTheDocument();
    expect(screen.getByText('1,284 wallets')).toBeInTheDocument();
    expect(screen.getByText('Top 10 wallets hold 58.4%.')).toBeInTheDocument();
  });
});
