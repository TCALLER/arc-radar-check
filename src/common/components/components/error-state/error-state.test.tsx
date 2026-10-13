import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ErrorState } from './error-state';

describe('ErrorState', () => {
  it('announces the error and offers a retry', async () => {
    const onRetry = vi.fn();
    render(
      <ErrorState
        title="The check took too long"
        description="Arc didn't answer in time."
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('The check took too long');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('works without a retry action', () => {
    render(<ErrorState title="Token not found" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
