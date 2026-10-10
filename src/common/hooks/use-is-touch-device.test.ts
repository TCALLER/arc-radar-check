import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useIsTouchDevice } from './use-is-touch-device';

const mockMatchMedia = (matches: boolean) =>
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );

afterEach(() => vi.unstubAllGlobals());

describe('useIsTouchDevice', () => {
  it('is true for a coarse pointer', () => {
    mockMatchMedia(true);
    expect(renderHook(() => useIsTouchDevice()).result.current).toBe(true);
  });

  it('is false for a fine pointer', () => {
    mockMatchMedia(false);
    expect(renderHook(() => useIsTouchDevice()).result.current).toBe(false);
  });
});

describe('useIsTouchDevice without matchMedia', () => {
  it('falls back to false', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(renderHook(() => useIsTouchDevice()).result.current).toBe(false);
  });
});
