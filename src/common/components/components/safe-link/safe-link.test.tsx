import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LINK_HIDDEN_NOTE, SafeLink } from './safe-link';

describe('SafeLink', () => {
  it('renders an https URL as an external link', () => {
    render(<SafeLink href="https://explorer.arc.io/" label="Token on Arc explorer" />);
    const link = screen.getByRole('link', { name: 'Token on Arc explorer' });

    expect(link).toHaveAttribute('href', 'https://explorer.arc.io/');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it.each([
    'javascript:alert(1)',
    'JAVASCRIPT:alert(1)',
    ' javascript:alert(1)',
    'data:text/html,x',
    'http://explorer.arc.io/',
    'nonsense',
  ])('shows %j as plain text with the note', (href) => {
    const { container } = render(<SafeLink href={href} label="Click here for official audit" />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(container.querySelector('a')).toBeNull();
    expect(screen.getByText('Click here for official audit')).toBeInTheDocument();
    expect(screen.getByText(LINK_HIDDEN_NOTE)).toBeInTheDocument();
  });

  it('handles a missing URL', () => {
    render(<SafeLink href={null} label="No link" />);
    expect(screen.getByText(LINK_HIDDEN_NOTE)).toBeInTheDocument();
  });
});
