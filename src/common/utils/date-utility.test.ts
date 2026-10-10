import { describe, expect, it } from 'vitest';

import { formatDate, formatDateTime } from './date-utility';

describe('date-utility', () => {
  it('formats a valid ISO date', () => {
    expect(formatDate('2026-10-07T08:00:00Z')).toBe('7 Oct 2026');
  });

  it('formats a valid ISO date with time', () => {
    expect(formatDateTime('2026-09-20T14:02:11Z')).toBe('20 Sep 2026, 14:02');
  });

  it('returns the fallback for invalid or missing dates', () => {
    expect(formatDate('not-a-date')).toBe('—');
    expect(formatDate('')).toBe('—');
    expect(formatDate(null)).toBe('—');
    expect(formatDateTime(undefined)).toBe('—');
  });
});
