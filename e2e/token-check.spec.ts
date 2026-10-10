import { expect, test } from '@playwright/test';

import { checkToken, MOCK, trackApiCalls } from './support/helpers';

test.describe('Token check flows (all four samples)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('invalid address: inline error, nothing sent', async ({ page }) => {
    const calls = trackApiCalls(page);
    await checkToken(page, '0x12ab');

    await expect(page.getByText("This isn't a token address yet.", { exact: false })).toBeVisible();
    await expect(page.getByLabel('Token address')).toHaveAttribute('aria-invalid', 'true');
    expect(calls.checks).toEqual([]);
  });

  test('check-ok.json: free preview and locked report', async ({ page }) => {
    await checkToken(page, MOCK.ok);

    await expect(page.getByText('Be careful', { exact: true })).toBeVisible();
    const result = page.getByRole('region', { name: 'Result' });
    await expect(result).toContainText('Sample Token');
    await expect(result).toContainText('2 warning signs found. 1,284 wallets hold it.');
    await expect(page.getByText('8 sections locked')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Connect wallet' })).toBeVisible();
    // Locked data is never in the page.
    await expect(page.locator('body')).not.toContainText('Ten wallets hold 58% of the supply');
    await expect(page.getByText('Mock version')).toBeVisible();
  });

  test('check-hostile.json: nothing executes, no unsafe link, layout intact', async ({ page }) => {
    const dialogs: string[] = [];
    page.on('dialog', async (dialog) => {
      dialogs.push(dialog.message());
      await dialog.dismiss();
    });

    await page.goto('/?state=hostile');
    await expect(page.getByText('Free for holders. Your full report is open.')).toBeVisible();

    await expect(page.getByText("<script>alert('x')</script>")).toBeVisible();
    await expect(page.locator('main script')).toHaveCount(0);
    await expect(page.locator('main img')).toHaveCount(0);

    const hrefs = await page
      .locator('main a')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
    expect(hrefs).toEqual(['https://explorer.arc.io/']);
    await expect(page.getByText("Link hidden: it isn't a secure https link.")).toBeVisible();
    await expect(
      page.getByText('One label had hidden text-direction characters. We removed them.'),
    ).toBeVisible();
    expect(await page.locator('main').innerText()).not.toContain('‮');

    // The 100+ character label is cut off and opens on tap.
    const longLabel = page.getByRole('button', { name: /OFFICIAL_SAFE_VERIFIED/ });
    await expect(longLabel).toHaveAttribute('aria-expanded', 'false');
    await longLabel.click();
    await expect(longLabel).toHaveAttribute('aria-expanded', 'true');

    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflows).toBe(false);
    expect(dialogs).toEqual([]);
  });

  test('check-error.json: API message and a new search', async ({ page }) => {
    await checkToken(page, MOCK.unknown);

    const alert = page.getByRole('main').getByRole('alert');
    await expect(alert).toContainText("This check didn't work");
    await expect(alert).toContainText(
      'No token contract was found at this address on Arc mainnet.',
    );
    await expect(alert).not.toContainText('TOKEN_NOT_FOUND');

    await page.getByRole('button', { name: 'Try another address' }).click();
    await expect(page.getByLabel('Token address')).toHaveValue('');
    await expect(page.getByLabel('Token address')).toBeFocused();
  });

  test('check-payment-required.json (402): pay placeholder at the sample price', async ({
    page,
  }) => {
    await checkToken(page, MOCK.paymentRequired);

    await expect(page.getByText('This check needs payment')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pay 0.50 USDC' })).toBeDisabled();
    await expect(page.getByText('Payment is coming soon.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Connect wallet' })).toBeVisible();
  });

  test('loading and timeout with retry', async ({ page }) => {
    test.slow();
    await checkToken(page, MOCK.timeout);

    await expect(page.getByRole('status').filter({ hasText: 'Scanning Arc…' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Scanning…' })).toBeDisabled();
    await expect(page.getByText('The check took too long')).toBeVisible({ timeout: 25_000 });
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  });

  test('a second check replaces the first', async ({ page }) => {
    await checkToken(page, MOCK.ok);
    await expect(page.getByText('Be careful', { exact: true })).toBeVisible();

    await page.getByLabel('Token address').fill(MOCK.paymentRequired);
    await page.getByRole('button', { name: 'Check token' }).click();
    await expect(page.getByText('This check needs payment')).toBeVisible();
  });
});

test.describe('Theme', () => {
  test('switches between light and dark', async ({ page }) => {
    await page.goto('/');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'light');

    await page.getByRole('button', { name: 'Switch to dark mode' }).click();
    await expect(html).toHaveAttribute('data-theme', 'dark');

    await page.getByRole('button', { name: 'Switch to light mode' }).click();
    await expect(html).toHaveAttribute('data-theme', 'light');
  });
});
