import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RadarScope } from './radar-scope';

describe('RadarScope', () => {
  it('is hidden from assistive technology', () => {
    const { container } = render(<RadarScope state="still" />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('shows the sweep only while scanning', () => {
    const { rerender } = render(<RadarScope state="sweep" />);
    expect(screen.getByTestId('radar-sweep')).toBeInTheDocument();

    rerender(<RadarScope state="still" />);
    expect(screen.queryByTestId('radar-sweep')).not.toBeInTheDocument();
  });

  it('draws one blip per flag, at most 8, with their tones', () => {
    const tones = [
      'high',
      'medium',
      'high',
      'low',
      'info',
      'high',
      'high',
      'medium',
      'high',
    ] as const;
    render(<RadarScope state="blips" blips={tones} />);

    const blips = screen.getAllByTestId('radar-blip');
    expect(blips).toHaveLength(8);
    expect(blips[0]).toHaveAttribute('data-tone', 'high');
    expect(blips[1]).toHaveAttribute('data-tone', 'medium');
  });

  it('draws no blips outside the blips state', () => {
    render(<RadarScope state="outline" blips={['neutral', 'neutral']} />);
    expect(screen.queryByTestId('radar-blip')).not.toBeInTheDocument();
  });
});
