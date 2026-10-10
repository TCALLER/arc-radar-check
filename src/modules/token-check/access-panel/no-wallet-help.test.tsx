import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { NoWalletHelp } from './no-wallet-help';

import type { NoWalletPlatform } from './types';

const renderHelp = (platform: NoWalletPlatform, isLinkCopied = false) => {
  const onCopyLink = vi.fn();
  const onOpenInBrowser = vi.fn();
  render(
    <NoWalletHelp
      platform={platform}
      isLinkCopied={isLinkCopied}
      onCopyLink={onCopyLink}
      onOpenInBrowser={onOpenInBrowser}
    />,
  );
  return { onCopyLink, onOpenInBrowser };
};

describe('NoWalletHelp', () => {
  it('desktop: asks to install a browser wallet extension', () => {
    renderHelp('desktop');
    expect(
      screen.getByText('Install a browser wallet extension, then reload this page.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it("mobile: copy the link into the wallet's browser", async () => {
    const { onCopyLink } = renderHelp('mobile');
    await userEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    expect(onCopyLink).toHaveBeenCalledOnce();
  });

  it('telegram: open in browser, copy link, and how to leave the in-app browser', async () => {
    const { onCopyLink, onOpenInBrowser } = renderHelp('telegram');
    await userEvent.click(screen.getByRole('button', { name: 'Open in browser' }));
    await userEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    expect(onOpenInBrowser).toHaveBeenCalledOnce();
    expect(onCopyLink).toHaveBeenCalledOnce();
    expect(
      screen.getByText((_, element) =>
        element?.tagName === 'P'
          ? element.textContent === 'Still in Telegram? Tap ⋯ and choose Open in browser.'
          : false,
      ),
    ).toBeInTheDocument();
  });

  it('shows when the link was copied', () => {
    renderHelp('telegram', true);
    expect(screen.getByRole('button', { name: 'Link copied' })).toBeInTheDocument();
  });
});
