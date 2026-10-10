import { expect, test } from '@playwright/test';

import { checkToken, MOCK } from './support/helpers';

import type { BrowserContext, Page } from '@playwright/test';

/** Simulates Telegram's WebApp SDK (loaded by the real script inside Telegram). */
test.beforeEach(async ({ page, context }) => {
  // Keep the real SDK script from overwriting the stub.
  await context.route('https://telegram.org/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }),
  );
  await page.addInitScript(() => {
    const opened: string[] = [];
    Object.assign(window, {
      __opened: opened,
      // The bridge the Telegram apps inject; a normal browser has none.
      TelegramWebviewProxy: { postEvent: () => undefined },
      Telegram: {
        WebApp: {
          initData: 'query_id=test&user=%7B%22first_name%22%3A%22Alex%22%7D&hash=fake',
          initDataUnsafe: { user: { first_name: 'Alex' } },
          colorScheme: 'dark',
          ready: () => undefined,
          expand: () => undefined,
          openLink: (url: string) => opened.push(url),
          onEvent: () => undefined,
          offEvent: () => undefined,
        },
      },
    });
  });
});

test('Telegram Mini App: telegram theme, name instead of theme switch, open in browser', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'telegram');
  await expect(page.locator('html')).toHaveAttribute('data-color-scheme', 'dark');
  await expect(page.getByRole('button', { name: /Switch to (dark|light) mode/ })).toHaveCount(0);
  // Display name from the (mocked) initData, in place of the theme switch.
  await expect(page.getByRole('banner').getByText('Alex')).toBeVisible();

  await checkToken(page, MOCK.ok);
  await expect(page.getByText('Be careful', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Connect wallet' }).click();

  await expect(page.getByText('Open in browser to connect')).toBeVisible();
  await expect(page.getByText('Still in Telegram? Tap', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Open in browser' }).click();
  const opened = await page.evaluate(() => (window as unknown as { __opened: string[] }).__opened);
  expect(opened).toHaveLength(1);
});

test("Open in browser passes a link without Telegram's launch data", async ({ page }) => {
  await page.goto(`/?holder=true#tgWebAppData=query_id%3Dtest&tgWebAppVersion=8.0`);
  await checkToken(page, MOCK.ok);
  await page.getByRole('button', { name: 'Connect wallet' }).click();
  await page.getByRole('button', { name: 'Open in browser' }).click();

  const opened = await page.evaluate(() => (window as unknown as { __opened: string[] }).__opened);
  const link = new URL(opened[0] ?? '');
  expect(link.hash).toBe('');
  expect(link.searchParams.get('holder')).toBe('true');
  expect(link.searchParams.get('token')).toBe(MOCK.ok);
});

test('Mini App and a browser sharing storage keep their own themes', async ({ page, context }) => {
  // Telegram's Mini App and its in-app browser share storage: one context, two tabs.
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'telegram');

  // A normal browser tab (no Telegram SDK stub) starts in light, not in the telegram theme.
  const browser = await context.newPage();
  await browser.goto('/');
  await expect(browser.locator('html')).toHaveAttribute('data-theme', 'light');
  await browser.getByRole('button', { name: 'Switch to dark mode' }).click();
  await expect(browser.locator('html')).toHaveAttribute('data-theme', 'dark');

  // The open Mini App ignores the browser's choice, now and after a fresh start.
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'telegram');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'telegram');

  // The browser keeps its own choice.
  await browser.reload();
  await expect(browser.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('a browser opened from the Mini App with its launch link is a normal browser page', async ({
  context,
}) => {
  // Telegram's ⋯ → Open in browser can pass the Mini App link with #tgWebAppData. The SDK then
  // has init data, but there is no Telegram bridge in a browser.
  const browser = await context.newPage();
  await browser.addInitScript(() => {
    Object.assign(window, {
      Telegram: {
        WebApp: {
          initData: 'query_id=test&hash=fake',
          initDataUnsafe: { user: { first_name: 'Alex' } },
          colorScheme: 'dark',
          ready: () => undefined,
          expand: () => undefined,
          openLink: () => undefined,
          onEvent: () => undefined,
          offEvent: () => undefined,
        },
      },
    });
  });
  await browser.goto(`/?token=${MOCK.ok}#tgWebAppData=query_id%3Dtest&tgWebAppVersion=8.0`);

  await expect(browser.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(browser.getByRole('button', { name: 'Switch to dark mode' })).toBeVisible();
  await expect(browser.getByRole('banner').getByText('Alex')).toHaveCount(0);
  // The launch data leaves the address bar; the token link still runs the check.
  await expect.poll(() => new URL(browser.url()).hash).toBe('');
  await expect(browser.getByText('Be careful', { exact: true })).toBeVisible();
  // Connect wallet offers the browser help, not "Open in browser".
  await browser.getByRole('button', { name: 'Connect wallet' }).click();
  await expect(browser.getByText('Open in browser to connect')).toHaveCount(0);
});

test.describe('first paint, before the app JavaScript runs', () => {
  const themeParams = encodeURIComponent(
    JSON.stringify({ bg_color: '#232e3c', secondary_bg_color: '#17212b', text_color: '#f5f5f5' }),
  );
  const launch = `#tgWebAppData=query_id%3Dtest&tgWebAppVersion=8.0&tgWebAppThemeParams=${themeParams}`;

  test('the Mini App paints in Telegram colours even with a saved browser theme', async ({
    context,
  }) => {
    const browser = await context.newPage();
    await browser.goto('/');
    await browser.getByRole('button', { name: 'Switch to dark mode' }).click();
    await expect(browser.locator('html')).toHaveAttribute('data-theme', 'dark');

    const mini = await context.newPage();
    await mini.addInitScript(() => {
      Object.assign(window, { TelegramWebviewProxy: { postEvent: () => undefined } });
    });
    // A slow phone: the app's JavaScript never arrives, so only the HTML and its inline scripts run.
    await mini.route('**/_next/static/**/*.js', () => undefined);
    await mini.goto(`/${launch}`, { waitUntil: 'domcontentloaded' });

    const html = mini.locator('html');
    await expect(html).toHaveAttribute('data-telegram', '');
    await expect(html).toHaveAttribute('data-color-scheme', 'dark');
    // Telegram's own page colour (secondary_bg_color), not the browser's dark paper.
    await expect(mini.locator('body')).toHaveCSS('background-color', 'rgb(23, 33, 43)');
  });

  test('a browser opened with the launch link paints in its own theme', async ({ context }) => {
    // A fresh tab: no Telegram bridge (the beforeEach stub is only on the default page).
    const browser = await context.newPage();
    await browser.route('**/_next/static/**/*.js', () => undefined);
    await browser.goto(`/${launch}`, { waitUntil: 'domcontentloaded' });
    await expect(browser.locator('html')).not.toHaveAttribute('data-telegram', '');
    await expect(browser.locator('body')).toHaveCSS('background-color', 'rgb(245, 244, 247)');
  });
});

test.describe('Telegram SDK late or failing on a Mini App open', () => {
  // Like the real SDK, the stand-in reads the launch data from the address bar.
  const fakeSdk = () => {
    const data = new URLSearchParams(location.hash.slice(1)).get('tgWebAppData') ?? '';
    const opened: string[] = [];
    Object.assign(window, {
      __opened: opened,
      Telegram: {
        WebApp: {
          initData: data,
          initDataUnsafe: data ? { user: { first_name: 'Alex' } } : {},
          colorScheme: 'light',
          ready: () => undefined,
          expand: () => undefined,
          openLink: (url: string) => opened.push(url),
          onEvent: () => undefined,
          offEvent: () => undefined,
        },
      },
    });
  };
  const sdkBody = `(${fakeSdk.toString()})();`;
  const launch = '#tgWebAppData=query_id%3Dtest&tgWebAppVersion=8.0';

  const openMiniApp = async (context: BrowserContext, failFirstLoads: number, delayMs = 0) => {
    let attempts = 0;
    await context.route('https://telegram.org/js/telegram-web-app.js**', async (route) => {
      attempts += 1;
      if (attempts <= failFirstLoads) return route.abort('failed');
      if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
      return route.fulfill({ contentType: 'application/javascript', body: sdkBody });
    });
    const mini = await context.newPage();
    await mini.addInitScript(() => {
      Object.assign(window, { TelegramWebviewProxy: { postEvent: () => undefined } });
    });
    await mini.goto(`/${launch}`);
    return mini;
  };

  const expectMiniApp = async (mini: Page) => {
    await expect(mini.getByRole('banner').getByText('Alex')).toBeVisible({ timeout: 10_000 });
    await expect(mini.getByRole('button', { name: /Switch to (dark|light) mode/ })).toHaveCount(0);
    await expect(mini.locator('html')).toHaveAttribute('data-theme', 'telegram');
    expect(new URL(mini.url()).hash).toContain('tgWebAppData=');
  };

  test('the SDK fails once: it is loaded again and the Mini App recovers', async ({ context }) => {
    const mini = await openMiniApp(context, 1);
    // Before the SDK is back, the page already acts as the Mini App: no theme switch.
    await expect(mini.getByRole('textbox', { name: 'Token address' })).toBeEditable();
    expect(await mini.getByRole('button', { name: /Switch to (dark|light) mode/ }).count()).toBe(0);
    await expect(mini.locator('html')).toHaveAttribute('data-theme', 'telegram');
    await expectMiniApp(mini);

    await checkToken(mini, MOCK.ok);
    await mini.getByRole('button', { name: 'Connect wallet' }).click();
    await expect(mini.getByRole('button', { name: 'Open in browser' })).toBeVisible();
  });

  test('the SDK is slow: launch data is kept and the Mini App recovers', async ({ context }) => {
    const mini = await openMiniApp(context, 0, 1_500);
    await expectMiniApp(mini);
  });
});

test('the SDK never loads: name and Open in browser still work through the Telegram bridge', async ({
  context,
}) => {
  await context.route('https://telegram.org/js/telegram-web-app.js**', (route) =>
    route.abort('failed'),
  );
  const mini = await context.newPage();
  await mini.addInitScript(() => {
    const events: string[] = [];
    Object.assign(window, {
      __events: events,
      TelegramWebviewProxy: {
        postEvent: (type: string, data: string) => events.push(`${type} ${data}`),
      },
    });
  });
  const user = encodeURIComponent(JSON.stringify({ first_name: 'Alex' }));
  await mini.goto(
    `/?holder=true#tgWebAppData=${encodeURIComponent(`query_id=test&user=${user}&hash=fake`)}`,
  );

  await expect(mini.getByRole('banner').getByText('Alex')).toBeVisible();
  await expect(mini.getByRole('button', { name: /Switch to (dark|light) mode/ })).toHaveCount(0);

  await checkToken(mini, MOCK.ok);
  await mini.getByRole('button', { name: 'Connect wallet' }).click();
  await mini.getByRole('button', { name: 'Open in browser' }).click();
  const events = await mini.evaluate(() => (window as unknown as { __events: string[] }).__events);
  const openLink = events.find((event) => event.startsWith('web_app_open_link '));
  const { url } = JSON.parse(openLink?.slice('web_app_open_link '.length) ?? '{}') as {
    url?: string;
  };
  const link = new URL(url ?? '');
  expect(link.hash).toBe('');
  expect(link.searchParams.get('token')).toBe(MOCK.ok);
  expect(link.searchParams.get('holder')).toBe('true');
});
