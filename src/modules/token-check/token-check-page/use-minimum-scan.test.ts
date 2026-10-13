import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useMinimumScan } from './use-minimum-scan';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useMinimumScan', () => {
  it('is not holding until a scan starts', () => {
    const { result } = renderHook(() => useMinimumScan(600));
    expect(result.current.isHolding).toBe(false);
  });

  it('holds for the minimum duration, then releases', () => {
    const { result } = renderHook(() => useMinimumScan(600));
    act(() => result.current.startHold());
    expect(result.current.isHolding).toBe(true);

    act(() => vi.advanceTimersByTime(599));
    expect(result.current.isHolding).toBe(true);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.isHolding).toBe(false);
  });

  it('restarts the hold when a new scan starts mid-hold', () => {
    const { result } = renderHook(() => useMinimumScan(600));
    act(() => result.current.startHold());
    act(() => vi.advanceTimersByTime(400));
    act(() => result.current.startHold());
    act(() => vi.advanceTimersByTime(400));
    expect(result.current.isHolding).toBe(true);
    act(() => vi.advanceTimersByTime(200));
    expect(result.current.isHolding).toBe(false);
  });
});
