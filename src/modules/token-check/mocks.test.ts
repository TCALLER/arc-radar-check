import { describe, expect, it } from 'vitest';

import { resolveMockHolder } from './mocks';

describe('resolveMockHolder', () => {
  it('answers holder only with ?holder=true on the page URL', () => {
    expect(resolveMockHolder('?holder=true')).toBe(true);
    expect(resolveMockHolder('?state=locked&holder=true')).toBe(true);
  });

  it('answers not a holder for a plain link or any other value', () => {
    expect(resolveMockHolder('')).toBe(false);
    expect(resolveMockHolder('?holder=false')).toBe(false);
    expect(resolveMockHolder('?holder=yes')).toBe(false);
    expect(resolveMockHolder('?holder=TRUE')).toBe(false);
  });
});
