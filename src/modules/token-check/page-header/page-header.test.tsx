import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PageHeader } from './page-header';

vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }) }));

describe('PageHeader', () => {
  it('shows the theme toggle and no name outside Telegram', () => {
    render(<PageHeader dataBadge="Mock version" isTelegram={false} telegramName="Alex" />);
    expect(screen.getByText('Mock version')).toBeInTheDocument();
    expect(screen.queryByText('Alex')).not.toBeInTheDocument();
  });

  it('shows the Telegram name in place of the toggle inside Telegram', () => {
    render(<PageHeader dataBadge={null} isTelegram telegramName="Alex" />);
    expect(screen.getByText('Hi,')).toBeInTheDocument();
    expect(screen.getByText('Alex')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Switch to/ })).not.toBeInTheDocument();
    expect(screen.queryByText('Mock version')).not.toBeInTheDocument();
  });

  it('renders a hostile name as isolated plain text without direction controls', () => {
    const { container } = render(
      <PageHeader dataBadge={null} isTelegram telegramName={'<img src=x onerror=alert(1)>‮evil'} />,
    );
    expect(container.querySelector('img')).toBeNull();
    const name = screen.getByText('<img src=x onerror=alert(1)>evil');
    expect(name.tagName).toBe('BDI');
  });

  it('shows no greeting inside Telegram when there is no name', () => {
    render(<PageHeader dataBadge={null} isTelegram telegramName={null} />);
    expect(screen.queryByText('Hi,')).not.toBeInTheDocument();
  });
});
