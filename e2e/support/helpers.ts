import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

export const MOCK = {
  ok: '0x1111111111111111111111111111111111111111',
  hostile: '0x7777777777777777777777777777777777777777',
  paymentRequired: '0x0000000000000000000000000000000000000402',
  timeout: '0x0000000000000000000000000000000000000408',
  unknown: '0x2222222222222222222222222222222222222222',
} as const;

export const checkToken = async (page: Page, address: string) => {
  const field = page.getByLabel('Token address');
  await field.fill(address);
  await page.getByRole('button', { name: 'Check token' }).click();
};

/** Fails on serious or critical accessibility violations (standards 09). */
export const expectNoSeriousA11yViolations = async (page: Page) => {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations
    .filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))
    .map(
      (violation) =>
        `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`,
    );
  expect(serious).toEqual([]);
};

/** Records requests to the check and access endpoints made by the page. */
export const trackApiCalls = (page: Page) => {
  const checks: string[] = [];
  const accesses: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname === '/v1/check') checks.push(url.searchParams.get('token') ?? '');
    if (url.pathname === '/v1/access')
      accesses.push((url.searchParams.get('wallet') ?? '').toLowerCase());
  });
  return { checks, accesses };
};
