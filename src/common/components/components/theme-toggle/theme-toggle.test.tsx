import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Theme } from '@/common/constants';

import { ThemeToggle } from './theme-toggle';

const setTheme = vi.fn();
let resolvedTheme: string = Theme.Light;
vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme, setTheme }) }));

afterEach(() => setTheme.mockReset());

describe('ThemeToggle', () => {
  it('switches from light to dark', async () => {
    resolvedTheme = Theme.Light;
    render(<ThemeToggle />);

    await userEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));

    expect(setTheme).toHaveBeenCalledWith(Theme.Dark);
  });

  it('switches from dark to light', async () => {
    resolvedTheme = Theme.Dark;
    render(<ThemeToggle />);

    await userEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }));

    expect(setTheme).toHaveBeenCalledWith(Theme.Light);
  });
});
