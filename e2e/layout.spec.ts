import { expect, test } from '@playwright/test';

import { checkToken, MOCK } from './support/helpers';

// In-app browsers (e.g. MetaMask) report the status bar as a safe-area inset under
// viewport-fit=cover, which pushed the page down with an empty band.
test('the page does not ask for edge-to-edge layout', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('meta[name="viewport"]')).not.toHaveAttribute(
    'content',
    /viewport-fit=cover/,
  );
  expect(
    await page.locator('header').evaluate((header) => header.getBoundingClientRect().top),
  ).toBe(0);
});

for (const width of [320, 768, 1024, 1440]) {
  test(`no sideways scrolling at ${width}px, before and after a check`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    await checkToken(page, MOCK.hostile);
    await expect(page.getByText('High risk', { exact: true }).first()).toBeVisible();

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
}
