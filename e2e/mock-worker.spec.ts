import { expect, test } from '@playwright/test';

import { installFakeWallet, mockArcRpc } from './support/fake-wallet';
import { checkToken, MOCK } from './support/helpers';

import type { Page } from '@playwright/test';

/**
 * Phones stop an idle service worker while the page is in the background (e.g. the user confirms
 * a network switch in the MetaMask app). The restarted MSW worker forgot the page, so mocked
 * requests went to the placeholder API host and failed, Retry included.
 */
const stopServiceWorkerInBackground = async (page: Page) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('ServiceWorker.enable');
  await cdp.send('ServiceWorker.stopAllWorkers');
  // Back in the foreground.
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
};

test('mocked API still answers after the phone stopped the service worker', async ({
  page,
  context,
}) => {
  await installFakeWallet(page);
  await mockArcRpc(context);
  await page.goto('/?holder=true');
  await checkToken(page, MOCK.ok);
  await expect(page.getByText('8 sections locked')).toBeVisible();

  await stopServiceWorkerInBackground(page);
  await page.getByRole('button', { name: 'Connect wallet' }).click();
  await expect(page.getByText('Free for holders. Your full report is open.')).toBeVisible();

  await stopServiceWorkerInBackground(page);
  await checkToken(page, MOCK.hostile);
  await expect(page.getByText('High risk', { exact: true }).first()).toBeVisible();
});

/** Stand-in for telegram-web-app.js inside the Telegram app (bridge included). */
const fakeTelegramSdk = () => {
  Object.assign(window, {
    TelegramWebviewProxy: { postEvent: () => undefined },
    Telegram: {
      WebApp: {
        initData: 'query_id=1',
        initDataUnsafe: {},
        colorScheme: 'dark',
        ready: () => undefined,
        expand: () => undefined,
        openLink: () => undefined,
        onEvent: () => undefined,
        offEvent: () => undefined,
      },
    },
  });
};

test('Telegram SDK still loads when the mock worker already controls the page', async ({
  context,
}) => {
  // Stand-in for telegram-web-app.js; the request still passes through the mock worker.
  await context.route('https://telegram.org/js/telegram-web-app.js', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `(${fakeTelegramSdk.toString()})();`,
    }),
  );

  // First open: the mock worker installs; it doesn't control this page yet.
  const first = await context.newPage();
  await first.goto('/');
  await expect(first.locator('html')).toHaveAttribute('data-theme', 'telegram');

  // Reopen (e.g. the Mini App closed and opened again): now the worker handles the SDK request.
  const reopened = await context.newPage();
  await reopened.goto('/');
  await expect
    .poll(() => reopened.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true);
  await expect(reopened.locator('html')).toHaveAttribute('data-theme', 'telegram');
});
