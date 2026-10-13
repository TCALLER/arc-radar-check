import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CheckForm } from './check-form';

vi.mock('@/common/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const ADDRESS = '0x1111111111111111111111111111111111111111';

const renderForm = () => {
  const onSubmit = vi.fn();
  render(<CheckForm checkedAddress={null} isScanning={false} onSubmit={onSubmit} />);
  return { onSubmit };
};

const stubClipboard = (readText: () => Promise<string>) =>
  Object.defineProperty(navigator, 'clipboard', { value: { readText }, configurable: true });

afterEach(() => vi.restoreAllMocks());

describe('CheckForm', () => {
  it('submits a trimmed valid address', async () => {
    const { onSubmit } = renderForm();
    await userEvent.type(screen.getByLabelText('Token address'), `  ${ADDRESS} `);
    await userEvent.click(screen.getByRole('button', { name: 'Check token' }));
    expect(onSubmit).toHaveBeenCalledWith(ADDRESS);
  });

  it('pastes from the clipboard', async () => {
    renderForm();
    stubClipboard(() => Promise.resolve(` ${ADDRESS}\n`));

    await userEvent.click(screen.getByRole('button', { name: 'Paste' }));

    expect(await screen.findByDisplayValue(ADDRESS)).toBeInTheDocument();
  });

  it('explains how to paste by hand when the browser blocks the clipboard', async () => {
    renderForm();
    stubClipboard(() => Promise.reject(new DOMException('denied', 'NotAllowedError')));

    await userEvent.click(screen.getByRole('button', { name: 'Paste' }));

    expect(await screen.findByText(/Your browser didn't allow Paste/)).toBeInTheDocument();
    expect(screen.getByLabelText('Token address')).toHaveFocus();
  });

  it('clears the field', async () => {
    renderForm();
    await userEvent.type(screen.getByLabelText('Token address'), ADDRESS);
    await userEvent.click(screen.getByRole('button', { name: 'Clear address' }));
    expect(screen.getByLabelText('Token address')).toHaveValue('');
  });
});
