import { SwitchChainError, UserRejectedRequestError } from 'viem';
import { describe, expect, it } from 'vitest';

import {
  formatUsdc,
  isArcChain,
  isReconnecting,
  isRequestPending,
  isUnknownChain,
  isUserRejection,
  toChainId,
} from './functions';

describe('formatUsdc', () => {
  it('formats a 6-decimal bigint without losing precision', () => {
    expect(formatUsdc(42_180_000n)).toBe('42.18');
    expect(formatUsdc(0n)).toBe('0');
    expect(formatUsdc(1n)).toBe('0.000001');
    expect(formatUsdc(1_234_567_890_000n)).toBe('1,234,567.89');
    expect(formatUsdc(123_456_789_012_345_678_901_234_567n)).toBe(
      '123,456,789,012,345,678,901.234567',
    );
  });
});

describe('error helpers', () => {
  it('detects a user rejection, also when nested', () => {
    expect(isUserRejection({ code: 4001 })).toBe(true);
    expect(isUserRejection(new UserRejectedRequestError(new Error('no')))).toBe(true);
    expect(isUserRejection({ code: -32603, cause: { code: 4001 } })).toBe(true);
    expect(isUserRejection(new Error('other'))).toBe(false);
  });

  it('detects an unknown chain (4902)', () => {
    expect(isUnknownChain(new SwitchChainError(new Error('unknown')))).toBe(true);
    expect(isUnknownChain({ code: 4902 })).toBe(true);
    expect(isUnknownChain({ code: 4001 })).toBe(false);
    expect(isUnknownChain(null)).toBe(false);
  });

  it('checks for Arc mainnet', () => {
    expect(isArcChain(5042)).toBe(true);
    expect(isArcChain(5042002)).toBe(false);
    expect(isArcChain(null)).toBe(false);
  });
});

describe('isRequestPending', () => {
  it('detects a request already waiting in the wallet (-32002)', () => {
    expect(isRequestPending({ code: -32002 })).toBe(true);
    expect(isRequestPending({ code: 4001 })).toBe(false);
  });
});

describe('toChainId', () => {
  it('reads hex, decimal and numeric chain ids', () => {
    expect(toChainId('0x13b2')).toBe(5042);
    expect(toChainId('0X13B2')).toBe(5042);
    expect(toChainId('5042')).toBe(5042);
    expect(toChainId(5042)).toBe(5042);
  });

  it('returns null for anything else', () => {
    expect(toChainId('arc')).toBeNull();
    expect(toChainId(null)).toBeNull();
    expect(toChainId(0)).toBeNull();
    expect(toChainId(1.5)).toBeNull();
  });
});

describe('isReconnecting', () => {
  it('spots MetaMask code 1013 only', () => {
    expect(isReconnecting({ code: 1013 })).toBe(true);
    expect(isReconnecting({ code: 4900 })).toBe(false);
    expect(isReconnecting(undefined)).toBe(false);
  });
});
