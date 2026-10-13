import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Badge } from './badge';

describe('Badge', () => {
  it('renders its text', () => {
    render(<Badge tone="sample">Sample data</Badge>);
    expect(screen.getByText('Sample data')).toBeInTheDocument();
  });

  it('applies the tone colours', () => {
    render(<Badge tone="danger">High risk</Badge>);
    expect(screen.getByText('High risk')).toHaveClass('text-danger');
  });

  it('draws no border on verdict and severity badges', () => {
    render(<Badge tone="caution">Medium risk</Badge>);
    expect(screen.getByText('Medium risk')).toHaveClass('border-transparent');
  });

  it('keeps the outline on the Sample data badge', () => {
    render(<Badge tone="sample">Sample data</Badge>);
    const badge = screen.getByText('Sample data');
    expect(badge).toHaveClass('border-sample-border');
    expect(badge).not.toHaveClass('border-transparent');
  });
});
