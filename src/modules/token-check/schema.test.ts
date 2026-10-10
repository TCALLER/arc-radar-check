import { describe, expect, it } from 'vitest';

import checkError from '@samples/check-error.json';
import checkHostile from '@samples/check-hostile.json';
import checkOk from '@samples/check-ok.json';
import checkPaymentRequired from '@samples/check-payment-required.json';

import { AccessResponseSchema, CheckResponseSchema, CheckStatus, VerdictLevel } from './schema';

describe('CheckResponseSchema', () => {
  it('parses check-ok.json', () => {
    const result = CheckResponseSchema.parse(checkOk);
    expect(result.status).toBe(CheckStatus.Ok);
    if (result.status !== CheckStatus.Ok) return;
    expect(result.verdict.level).toBe(VerdictLevel.Caution);
    expect(result.token.total_supply).toBe('1000000000');
    expect(result.holders.count).toBe(1284);
    expect(result.risk_flags).toHaveLength(2);
  });

  it('parses check-hostile.json and keeps hostile strings as plain data', () => {
    const result = CheckResponseSchema.parse(checkHostile);
    if (result.status !== CheckStatus.Ok) throw new Error('expected ok');
    expect(result.token.symbol).toBe("<script>alert('x')</script>");
    expect(result.token.total_supply).toBe('1000000000000000000000000');
    expect(result.sources?.[0]?.url).toBe('javascript:alert(1)');
    expect(result.holders.top_holders?.[2]?.label).toBe('');
  });

  it('parses check-error.json', () => {
    const result = CheckResponseSchema.parse(checkError);
    expect(result).toMatchObject({ status: CheckStatus.Error, error: { code: 'TOKEN_NOT_FOUND' } });
  });

  it('parses check-payment-required.json with the price as a string', () => {
    const result = CheckResponseSchema.parse(checkPaymentRequired);
    expect(result).toMatchObject({
      status: CheckStatus.PaymentRequired,
      payment: { price_usdc: '0.50', network: 'arc', chain_id: 5042 },
    });
  });

  it('drops fields it does not know, such as _note', () => {
    expect(CheckResponseSchema.parse(checkOk)).not.toHaveProperty('_note');
  });

  it('accepts a response without the locked report fields (server-side gating)', () => {
    const preview = {
      status: 'ok',
      sample: false,
      token: { address: '0x1111111111111111111111111111111111111111', name: 'T', symbol: 'T' },
      verdict: { level: 'ok' },
      holders: { count: 10 },
      risk_flags: [],
    };
    expect(CheckResponseSchema.safeParse(preview).success).toBe(true);
  });

  it.each([
    ['an unknown status', { status: 'maybe' }],
    [
      'a payment on another chain',
      { ...checkPaymentRequired, payment: { ...checkPaymentRequired.payment, chain_id: 1 } },
    ],
    [
      'a payment on another network',
      { ...checkPaymentRequired, payment: { ...checkPaymentRequired.payment, network: 'base' } },
    ],
    [
      'a numeric total supply',
      { ...checkOk, token: { ...checkOk.token, total_supply: 1000000000 } },
    ],
    ['a score above 100', { ...checkOk, verdict: { ...checkOk.verdict, score: 140 } }],
    ['an unknown verdict level', { ...checkOk, verdict: { ...checkOk.verdict, level: 'safe' } }],
    ['an error without a message', { status: 'error', error: { code: 'X' } }],
  ])('rejects %s', (_name, value) => {
    expect(CheckResponseSchema.safeParse(value).success).toBe(false);
  });
});

describe('AccessResponseSchema', () => {
  it('accepts a boolean holder flag only', () => {
    expect(AccessResponseSchema.parse({ holder: true })).toEqual({ holder: true });
    expect(AccessResponseSchema.safeParse({ holder: 'true' }).success).toBe(false);
    expect(AccessResponseSchema.safeParse({}).success).toBe(false);
  });
});

describe('CheckResponseSchema: numbers are untrusted too', () => {
  const withPrice = (price_usdc: string) => ({
    ...checkPaymentRequired,
    payment: { ...checkPaymentRequired.payment, price_usdc },
  });
  const withOk = (patch: (sample: typeof checkOk) => unknown) =>
    CheckResponseSchema.safeParse(patch(structuredClone(checkOk))).success;

  it('accepts ordinary USDC prices', () => {
    for (const price of ['0.50', '0', '12', '12.5', '999999999999.123456']) {
      expect(CheckResponseSchema.safeParse(withPrice(price)).success).toBe(true);
    }
  });

  it('rejects prices that are not a plain USDC amount', () => {
    for (const price of [
      '00.5',
      '0.1234567',
      '-1',
      '1e5',
      ' 0.5',
      '0x10',
      '1,000',
      '',
      '.5',
      '1.',
      '1234567890123',
    ]) {
      expect(CheckResponseSchema.safeParse(withPrice(price)).success).toBe(false);
    }
  });

  it('caps whole-number strings at 78 digits (the largest on-chain amount)', () => {
    expect(withOk((s) => ({ ...s, token: { ...s.token, total_supply: '9'.repeat(78) } }))).toBe(
      true,
    );
    expect(withOk((s) => ({ ...s, token: { ...s.token, total_supply: '9'.repeat(79) } }))).toBe(
      false,
    );
    expect(withOk((s) => ({ ...s, burns: { ...s.burns, total_burned: '-1' } }))).toBe(false);
  });

  it('rejects out-of-range numbers', () => {
    expect(withOk((s) => ({ ...s, verdict: { ...s.verdict, score: 101 } }))).toBe(false);
    expect(withOk((s) => ({ ...s, verdict: { ...s.verdict, score: -1 } }))).toBe(false);
    expect(withOk((s) => ({ ...s, holders: { ...s.holders, count: 1.5 } }))).toBe(false);
    expect(withOk((s) => ({ ...s, holders: { ...s.holders, count: -1 } }))).toBe(false);
    expect(withOk((s) => ({ ...s, holders: { ...s.holders, top10_share_pct: 100.1 } }))).toBe(
      false,
    );
    expect(withOk((s) => ({ ...s, token: { ...s.token, decimals: 256 } }))).toBe(false);
    expect(withOk((s) => ({ ...s, chain: { ...s.chain, chain_id: 0 } }))).toBe(false);
    expect(withOk((s) => ({ ...s, burns: { ...s.burns, burned_pct_of_supply: -0.1 } }))).toBe(
      false,
    );
  });
});
