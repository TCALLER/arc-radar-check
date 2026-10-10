import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { TextInput } from './text-input';

describe('TextInput', () => {
  it('is labelled and accepts typing', async () => {
    render(<TextInput id="address" label="Token address" />);
    const input = screen.getByLabelText('Token address');

    await userEvent.type(input, '0x1111');

    expect(input).toHaveValue('0x1111');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('links helper and error text and marks the field invalid', () => {
    render(
      <TextInput
        id="address"
        label="Token address"
        helper="Starts with 0x"
        error="This isn't a valid token address."
      />,
    );
    const input = screen.getByLabelText('Token address');

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription("Starts with 0x This isn't a valid token address.");
  });

  it('renders trailing controls', () => {
    render(
      <TextInput id="a" label="Token address" trailing={<button type="button">Paste</button>} />,
    );
    expect(screen.getByRole('button', { name: 'Paste' })).toBeInTheDocument();
  });
});

describe('TextInput shake', () => {
  it('alternates animation names so each invalid submit replays the shake', () => {
    const { container, rerender } = render(
      <TextInput id="a" label="Token address" shakeCount={1} />,
    );
    expect(container.querySelector('.motion-safe\\:animate-shake')).not.toBeNull();

    rerender(<TextInput id="a" label="Token address" shakeCount={2} />);
    expect(container.querySelector('.motion-safe\\:animate-shake-alt')).not.toBeNull();
  });
});
