import { expect, test } from '@playwright/test';

import {
  approveSilently,
  ARC_CHAIN_HEX,
  emitWalletEvent,
  ETHEREUM_CHAIN_HEX,
  getWalletCalls,
  installFakeWallet,
  mockArcRpc,
  OTHER_ACCOUNT,
  WALLET_ACCOUNT,
} from './support/fake-wallet';
import { checkToken, MOCK, trackApiCalls } from './support/helpers';

import type { Page } from '@playwright/test';

const NOT_HOLDER = "This wallet doesn't hold our token. Pay to unlock the full report.";

const openLockedResult = async (page: Page) => {
  await page.goto('/');
  await checkToken(page, MOCK.ok);
  await expect(page.getByText('8 sections locked')).toBeVisible();
};

test.describe('Wallet and holder access', () => {
  test('no wallet installed: no access call, clear next step', async ({ page, isMobile }) => {
    const calls = trackApiCalls(page);
    await openLockedResult(page);

    await page.getByRole('button', { name: 'Connect wallet' }).click();

    if (isMobile) {
      await expect(page.getByText("Open in your wallet's browser")).toBeVisible();
      await expect(page.getByRole('button', { name: 'Copy link' })).toBeVisible();
    } else {
      await expect(
        page.getByText('Install a browser wallet extension, then reload this page.'),
      ).toBeVisible();
    }
    expect(calls.accesses).toEqual([]);
  });

  test('connect on Arc: USDC balance (6 decimals) and server holder answer', async ({
    page,
    context,
  }) => {
    await installFakeWallet(page);
    await mockArcRpc(context, { balance: 42_180_000n });
    const calls = trackApiCalls(page);
    await openLockedResult(page);
    expect(calls.accesses).toEqual([]);

    await page.getByRole('button', { name: 'Connect wallet' }).click();

    await expect(page.getByText(NOT_HOLDER)).toBeVisible();
    await expect(page.getByText('0x74a0…b98a')).toBeVisible();
    await expect(page.getByText('Arc mainnet', { exact: true })).toBeVisible();
    await expect(page.getByText('42.18')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pay 0.50 USDC' })).toBeDisabled();
    expect(calls.accesses).toEqual([WALLET_ACCOUNT]);
  });

  test('RPC down: says the balance is unavailable, access still works', async ({
    page,
    context,
  }) => {
    await installFakeWallet(page);
    await mockArcRpc(context, { fail: true });
    await openLockedResult(page);

    await page.getByRole('button', { name: 'Connect wallet' }).click();

    await expect(page.getByText(NOT_HOLDER)).toBeVisible();
    await expect(page.getByText("Couldn't read USDC balance")).toBeVisible({ timeout: 15_000 });
  });

  test('?holder=true on the page link makes the mocked server answer holder', async ({
    page,
    context,
  }) => {
    await installFakeWallet(page);
    await mockArcRpc(context, { balance: 42_180_000n });
    await page.goto('/?holder=true');
    await checkToken(page, MOCK.ok);

    await page.getByRole('button', { name: 'Connect wallet' }).click();

    await expect(page.getByText('Free for holders. Your full report is open.')).toBeVisible();
  });

  test('silent wallet: Cancel after 10 s, and an approval made in the wallet app is picked up on return', async ({
    page,
    context,
  }) => {
    await installFakeWallet(page, { silentConnect: true });
    await mockArcRpc(context);
    await openLockedResult(page);

    await page.getByRole('button', { name: 'Connect wallet' }).click();
    await expect(page.getByText('Confirm in your wallet…')).toBeVisible();
    await expect(page.getByText(/Nothing in your wallet\?/)).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('button', { name: 'Connect wallet' })).toBeEnabled();

    // Try again, approve in the wallet app, come back: the page asks the wallet and connects.
    await page.getByRole('button', { name: 'Connect wallet' }).click();
    await approveSilently(page);
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await expect(page.getByText(NOT_HOLDER)).toBeVisible();
    await expect(page.getByText('0x74a0…b98a')).toBeVisible();
  });

  test('wrong network: switch falls back to adding Arc (4902)', async ({ page, context }) => {
    await installFakeWallet(page, { chainId: ETHEREUM_CHAIN_HEX, unknownArc: true });
    await mockArcRpc(context);
    const calls = trackApiCalls(page);
    await openLockedResult(page);

    await page.getByRole('button', { name: 'Connect wallet' }).click();
    await expect(page.getByText('Your wallet is on another network')).toBeVisible();
    await expect(page.getByText('Another network', { exact: true })).toBeVisible();
    // Holder status is about the address, so it's checked on any network.
    await expect.poll(() => calls.accesses.length).toBe(1);

    await page.getByRole('button', { name: 'Switch to Arc mainnet' }).click();

    await expect(page.getByText('Your wallet is on another network')).toBeHidden();
    await expect(page.getByText('42.18')).toBeVisible();
    const methods = (await getWalletCalls(page)).map((call) => call.method);
    expect(methods).toEqual(
      expect.arrayContaining(['wallet_switchEthereumChain', 'wallet_addEthereumChain']),
    );
    const added = (await getWalletCalls(page)).find(
      (call) => call.method === 'wallet_addEthereumChain',
    );
    expect(added?.params).toEqual([
      expect.objectContaining({
        chainId: ARC_CHAIN_HEX,
        chainName: 'Arc',
        nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
        blockExplorerUrls: ['https://explorer.arc.io'],
      }),
    ]);
  });

  test('cancelled connection: stays locked with a short message', async ({ page }) => {
    await installFakeWallet(page, { rejectConnect: true });
    await openLockedResult(page);

    await page.getByRole('button', { name: 'Connect wallet' }).click();

    await expect(page.getByText('You cancelled the request in your wallet.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Connect wallet' })).toBeVisible();
  });

  test('account change re-checks; disconnect locks again', async ({ page, context }) => {
    await installFakeWallet(page);
    await mockArcRpc(context);
    const calls = trackApiCalls(page);
    await openLockedResult(page);
    await page.getByRole('button', { name: 'Connect wallet' }).click();
    await expect(page.getByText(NOT_HOLDER)).toBeVisible();

    await emitWalletEvent(page, 'accountsChanged', [OTHER_ACCOUNT]);
    await expect(page.getByText('0x4444…4444')).toBeVisible();
    await expect.poll(() => calls.accesses).toEqual([WALLET_ACCOUNT, OTHER_ACCOUNT]);

    await emitWalletEvent(page, 'accountsChanged', []);
    await expect(page.getByRole('button', { name: 'Connect wallet' })).toBeVisible();
    await expect(page.getByText('0x4444…4444')).toBeHidden();
  });

  test('disconnect: revokes access, locks again, and stays disconnected after reload', async ({
    page,
    context,
  }) => {
    await installFakeWallet(page);
    await mockArcRpc(context);
    await openLockedResult(page);
    await page.getByRole('button', { name: 'Connect wallet' }).click();
    await expect(page.getByText(NOT_HOLDER)).toBeVisible();

    await page.getByRole('button', { name: 'Disconnect' }).click();

    await expect(page.getByRole('button', { name: 'Connect wallet' })).toBeVisible();
    await expect(page.getByText('0x74a0…b98a')).toBeHidden();
    expect((await getWalletCalls(page)).map((call) => call.method)).toContain(
      'wallet_revokePermissions',
    );

    await page.reload();
    await checkToken(page, MOCK.ok);
    await expect(page.getByRole('button', { name: 'Connect wallet' })).toBeVisible();
  });

  test('holder: the full report opens with every section', async ({ page }) => {
    await page.goto('/?state=holder');

    await expect(page.getByText('Free for holders. Your full report is open.')).toBeVisible();
    for (const heading of [
      'Safety score',
      'In plain words',
      'Warning signs',
      'Who holds it',
      'Burns',
      'Buybacks',
      'Token details',
      'Sources',
    ]) {
      await expect(page.getByRole('heading', { level: 3, name: heading })).toBeVisible();
    }
    await expect(page.getByText('125,000,000 tokens burned, 12.5% of supply.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Token on Arc explorer' })).toHaveAttribute(
      'rel',
      'noopener noreferrer',
    );
  });
});

test.describe('Connecting from the 402 screen', () => {
  test('without a wallet: help appears in the payment panel', async ({ page, isMobile }) => {
    await page.goto('/');
    await checkToken(page, MOCK.paymentRequired);
    await page.getByRole('button', { name: 'Connect wallet' }).click();

    await expect(
      page.getByText(
        isMobile
          ? "Open in your wallet's browser"
          : 'Install a browser wallet extension, then reload this page.',
      ),
    ).toBeVisible();
  });

  test('with a wallet: wallet row and holder answer appear in the payment panel', async ({
    page,
    context,
  }) => {
    await installFakeWallet(page);
    await mockArcRpc(context);
    await page.goto('/');
    await checkToken(page, MOCK.paymentRequired);
    await page.getByRole('button', { name: 'Connect wallet' }).click();

    await expect(
      page.getByText("This wallet doesn't hold our token. Pay for this check."),
    ).toBeVisible();
    await expect(page.getByText('0x74a0…b98a')).toBeVisible();
    await expect(page.getByText('42.18')).toBeVisible();
  });
});
