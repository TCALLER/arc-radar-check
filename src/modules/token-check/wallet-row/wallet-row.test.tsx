import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { WalletRow } from './wallet-row';

const base = {
  address: '0x74a004FF29bc3972d09fd0000000000000007cB98',
  isOnArc: true,
  balance: null,
};

describe('WalletRow', () => {
  it('shows the short address, network and balance', () => {
    render(<WalletRow wallet={{ ...base, balance: '42.18', balanceState: 'ready' }} />);
    expect(screen.getByText('0x74a0…cB98')).toBeInTheDocument();
    expect(screen.getByText('Arc mainnet')).toBeInTheDocument();
    expect(screen.getByText('42.18')).toBeInTheDocument();
  });

  it('says when the balance could not be read', () => {
    render(<WalletRow wallet={{ ...base, balanceState: 'error' }} />);
    expect(screen.getByText('Unavailable')).toBeInTheDocument();
    expect(screen.getByText("Couldn't read USDC balance")).toBeInTheDocument();
  });

  it('shows a dash on another network and a placeholder while loading', () => {
    const { rerender } = render(
      <WalletRow wallet={{ ...base, isOnArc: false, balanceState: 'offArc' }} />,
    );
    expect(screen.getByText('Another network')).toBeInTheDocument();
    expect(screen.getByText('–')).toBeInTheDocument();

    rerender(<WalletRow wallet={{ ...base, balanceState: 'loading' }} />);
    expect(screen.getByText('…')).toBeInTheDocument();
  });
});
