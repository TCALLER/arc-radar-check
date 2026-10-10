import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Notice } from './notice';

describe('Notice', () => {
  it('renders an alert with title, text and action', () => {
    render(
      <Notice
        tone="caution"
        title="Your wallet is on another network"
        action={<button>Switch</button>}
      >
        Switch to Arc mainnet to see your USDC balance.
      </Notice>,
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Your wallet is on another network');
    expect(alert).toHaveTextContent('Switch to Arc mainnet to see your USDC balance.');
    expect(screen.getByRole('button', { name: 'Switch' })).toBeInTheDocument();
  });

  it('can be a polite status instead of an alert', () => {
    render(<Notice role="status" title="Checking holder status…" />);
    expect(screen.getByRole('status')).toHaveTextContent('Checking holder status…');
  });
});
