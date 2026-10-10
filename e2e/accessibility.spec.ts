import { expect, test } from '@playwright/test';

import { expectNoSeriousA11yViolations } from './support/helpers';

const STATES = ['idle', 'invalid', 'error', 'payment402', 'locked', 'holder', 'hostile'] as const;

test.describe('Accessibility (axe, serious and critical)', () => {
  for (const state of STATES) {
    for (const theme of ['light', 'dark'] as const) {
      test(`${state} in ${theme}`, async ({ page }) => {
        // Scan the settled page: entrance animations fade content in.
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.goto(`/?state=${state}`);
        await expect(page.getByRole('heading', { level: 1 })).toBeAttached();
        if (state !== 'idle' && state !== 'invalid') {
          await expect(page.getByRole('button', { name: 'Scanning…' })).toHaveCount(0);
        }
        if (theme === 'dark') {
          await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
        }
        await expectNoSeriousA11yViolations(page);
      });
    }
  }
});
