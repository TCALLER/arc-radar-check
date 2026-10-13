import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Button } from './button';

describe('Button', () => {
  it('renders an accessible button and handles clicks', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Check</Button>);

    await userEvent.click(screen.getByRole('button', { name: 'Check' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders a link when used with asChild', () => {
    render(
      <Button variant="link" asChild>
        <a href="https://explorer.arc.io/">Explorer</a>
      </Button>,
    );
    expect(screen.getByRole('link', { name: 'Explorer' })).toHaveAttribute(
      'href',
      'https://explorer.arc.io/',
    );
  });

  it('can be disabled', () => {
    render(<Button disabled>Pay 0.50 USDC</Button>);
    expect(screen.getByRole('button', { name: 'Pay 0.50 USDC' })).toBeDisabled();
  });
});

describe('Button variants', () => {
  it('does not inherit the primary background for link buttons', () => {
    render(<Button variant="link">What does this mean?</Button>);
    expect(screen.getByRole('button', { name: 'What does this mean?' })).not.toHaveClass(
      'bg-primary',
    );
  });
});
