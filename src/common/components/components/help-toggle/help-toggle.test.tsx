import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { HelpToggle } from './help-toggle';

describe('HelpToggle', () => {
  it('is closed by default and opens on click with the general-help caption', async () => {
    render(
      <HelpToggle>
        <p>A burn sends tokens to an address no one controls.</p>
      </HelpToggle>,
    );

    const trigger = screen.getByRole('button', { name: 'What does this mean?' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('General help, not part of this report')).not.toBeInTheDocument();

    await userEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('General help, not part of this report')).toBeInTheDocument();
    expect(
      screen.getByText('A burn sends tokens to an address no one controls.'),
    ).toBeInTheDocument();
  });
});
