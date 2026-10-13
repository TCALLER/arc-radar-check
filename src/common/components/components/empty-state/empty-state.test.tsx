import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  it('renders the message', () => {
    render(<EmptyState message="No warning signs in this report." />);
    expect(screen.getByText('No warning signs in this report.')).toBeInTheDocument();
  });
});
