import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Bar } from './bar';

describe('Bar', () => {
  it('exposes a labelled progress bar with the true value', () => {
    render(<Bar value={21.3} label="Wallet 0x2222… holds 21.3%" />);
    const bar = screen.getByRole('progressbar', { name: 'Wallet 0x2222… holds 21.3%' });
    expect(bar).toHaveAttribute('aria-valuenow', '21.3');
  });

  it('keeps a 2px minimum for tiny values, but not for zero', () => {
    const { rerender } = render(<Bar value={0.1} label="tiny" />);
    expect(screen.getByRole('progressbar')).toHaveClass('before:w-0.5');

    rerender(<Bar value={0} label="zero" />);
    expect(screen.getByRole('progressbar')).not.toHaveClass('before:w-0.5');
  });

  it('clamps out-of-range values', () => {
    render(<Bar value={140} label="over" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('hides the decorative burn bar from screen readers', () => {
    const { container } = render(<Bar variant="burn" value={0} />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
    expect(container.firstChild).toHaveClass('burn-empty');
  });
});
