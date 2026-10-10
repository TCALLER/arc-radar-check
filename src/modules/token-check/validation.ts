import { isAddress } from 'viem';
import { z } from 'zod';

export const ADDRESS_MESSAGES = {
  empty: 'Paste a token address to check it.',
  invalid:
    "This isn't a token address yet. It starts with 0x and has 40 letters or numbers after it.",
  checksum:
    "This address has a typo: its capital letters don't match. Copy it again from the source.",
} as const;

const ADDRESS_SHAPE = /^0x[0-9a-fA-F]{40}$/;
// Zero-width, bidi and BOM characters that copying from some pages adds invisibly.
const INVISIBLE_CHARS = /[\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/g;

/** EIP-55: only mixed-case addresses carry a checksum; all-lower and all-upper are plain hex. */
const hasValidChecksum = (value: string): boolean => {
  const hex = value.slice(2);
  if (hex === hex.toLowerCase() || hex === hex.toUpperCase()) return true;
  return isAddress(value, { strict: true });
};

/**
 * A token address on Arc mainnet: invisible characters removed and trimmed, then 0x + 40
 * hex characters, with a valid EIP-55 checksum when it uses mixed case. Nothing is sent until
 * this passes.
 */
export const TokenAddressSchema = z
  .string()
  .transform((value) => value.replace(INVISIBLE_CHARS, '').trim())
  .pipe(
    z
      .string()
      .min(1, ADDRESS_MESSAGES.empty)
      .regex(ADDRESS_SHAPE, ADDRESS_MESSAGES.invalid)
      .refine(hasValidChecksum, ADDRESS_MESSAGES.checksum),
  );

export type TokenAddress = z.infer<typeof TokenAddressSchema>;
