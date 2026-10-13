import { describe, expect, it } from 'vitest';

import { ADDRESS_MESSAGES, TokenAddressSchema } from './validation';

const firstError = (value: string) => TokenAddressSchema.safeParse(value).error?.issues[0]?.message;

describe('TokenAddressSchema', () => {
  it.each([
    '0x1111111111111111111111111111111111111111',
    '0xabababababababababababababababababababab',
    '0xABABABABABABABABABABABABABABABABABABABAB',
    // Valid EIP-55 checksum (USDC on Arc)
    '0x3600000000000000000000000000000000000000',
    '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
  ])('accepts %s', (value) => {
    expect(TokenAddressSchema.safeParse(value).success).toBe(true);
  });

  it('trims surrounding spaces', () => {
    expect(TokenAddressSchema.parse('  0x1111111111111111111111111111111111111111 \n')).toBe(
      '0x1111111111111111111111111111111111111111',
    );
  });

  it('removes invisible characters copied along with the address', () => {
    const copied = '\u200B0x1111111111111111111111111111111111111111\uFEFF\u202E';
    expect(TokenAddressSchema.parse(copied)).toBe('0x1111111111111111111111111111111111111111');
    expect(TokenAddressSchema.safeParse('\u200B').success).toBe(false);
  });

  it('asks for an address when empty', () => {
    expect(firstError('   ')).toBe(ADDRESS_MESSAGES.empty);
  });

  it.each([
    '0x12ab',
    '1111111111111111111111111111111111111111',
    '0x11111111111111111111111111111111111111111',
    '0xg111111111111111111111111111111111111111',
    'hello',
  ])('rejects the malformed address %s', (value) => {
    expect(firstError(value)).toBe(ADDRESS_MESSAGES.invalid);
  });

  it('rejects a mixed-case address with a wrong checksum', () => {
    expect(firstError('0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAeD')).toBe(
      ADDRESS_MESSAGES.checksum,
    );
  });
});
