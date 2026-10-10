import { z } from 'zod';

import { ARC_CHAIN_ID } from '@/common/config/arc-chain';

export enum CheckStatus {
  Ok = 'ok',
  Error = 'error',
  PaymentRequired = 'payment_required',
}

export enum VerdictLevel {
  Ok = 'ok',
  Caution = 'caution',
  Danger = 'danger',
  Unknown = 'unknown',
}

export enum Severity {
  Info = 'info',
  Low = 'low',
  Medium = 'medium',
  High = 'high',
}

const ARC_NETWORK = 'arc';
const MAX_PERCENT = 100;

/*
 * Numbers are untrusted too: every one has a type, a range and a length, so an absurd value is an
 * invalid response rather than something that breaks the page. They are shown through
 * SafeText like any other API value.
 */
// The largest on-chain amount (uint256) has 78 digits.
const MAX_AMOUNT_DIGITS = 78;
// ERC-20 `decimals` is a uint8.
const MAX_TOKEN_DECIMALS = 255;

// Large numbers stay strings of digits; they are never converted to JS numbers.
const IntegerStringSchema = z
  .string()
  .regex(/^\d+$/, 'Expected a whole number as a string')
  .max(MAX_AMOUNT_DIGITS);
// A USDC price: no leading zeros, at most 6 decimals (USDC's precision), at most 12 whole digits.
const UsdcAmountSchema = z
  .string()
  .regex(/^(0|[1-9]\d{0,11})(\.\d{1,6})?$/, 'Expected a USDC amount as a string');
const PercentSchema = z.number().min(0).max(MAX_PERCENT);
const CountSchema = z.number().int().nonnegative();

/*
 * Every string below is untrusted: it is only ever displayed through SafeText / SafeLink. The
 * guard test in token-check-page.test.tsx attacks every free-text field of this schema, so a new
 * field shown any other way fails the tests.
 * Fields of the locked report are optional, so a future server that withholds them
 * until access is granted still parses, and the UI shows those sections as locked.
 */

const TokenSchema = z.object({
  address: z.string(),
  name: z.string(),
  symbol: z.string(),
  decimals: z.number().int().min(0).max(MAX_TOKEN_DECIMALS).optional(),
  total_supply: IntegerStringSchema.optional(),
});

const VerdictSchema = z.object({
  level: z.enum(VerdictLevel),
  score: z.number().min(0).max(MAX_PERCENT).optional(),
  headline: z.string().optional(),
});

const HolderSchema = z.object({
  address: z.string(),
  share_pct: PercentSchema,
  label: z.string().nullable(),
});

const HoldersSchema = z.object({
  count: CountSchema,
  top10_share_pct: PercentSchema.optional(),
  top_holders: z.array(HolderSchema).optional(),
});

const BurnEventSchema = z.object({
  tx_hash: z.string(),
  amount: IntegerStringSchema,
  timestamp: z.string(),
});

const BurnsSchema = z.object({
  claimed: z.boolean(),
  verified: z.boolean(),
  total_burned: IntegerStringSchema,
  burned_pct_of_supply: PercentSchema,
  events: z.array(BurnEventSchema),
});

const BuybacksSchema = z.object({
  claimed: z.boolean(),
  verified: z.boolean(),
  note: z.string().nullable(),
});

const RiskFlagSchema = z.object({
  code: z.string(),
  severity: z.enum(Severity),
  title: z.string(),
  explanation: z.string(),
});

const SourceSchema = z.object({
  type: z.string(),
  label: z.string(),
  url: z.string(),
});

const ChainSchema = z.object({
  name: z.string(),
  chain_id: z.number().int().positive(),
});

const BaseResponseSchema = z.object({
  schema_version: z.string().optional(),
  sample: z.boolean().default(false),
});

export const CheckOkSchema = BaseResponseSchema.extend({
  status: z.literal(CheckStatus.Ok),
  checked_at: z.string().optional(),
  chain: ChainSchema.optional(),
  token: TokenSchema,
  verdict: VerdictSchema,
  holders: HoldersSchema,
  burns: BurnsSchema.optional(),
  buybacks: BuybacksSchema.optional(),
  // Always present: the free preview shows how many warning signs were found.
  risk_flags: z.array(RiskFlagSchema),
  summary: z.string().optional(),
  sources: z.array(SourceSchema).optional(),
});

export const CheckErrorSchema = BaseResponseSchema.extend({
  status: z.literal(CheckStatus.Error),
  error: z.object({ code: z.string(), message: z.string() }),
});

export const CheckPaymentRequiredSchema = BaseResponseSchema.extend({
  status: z.literal(CheckStatus.PaymentRequired),
  // Validated, not shown separately: a different network or chain is an invalid response.
  payment: z.object({
    price_usdc: UsdcAmountSchema,
    network: z.literal(ARC_NETWORK),
    chain_id: z.literal(ARC_CHAIN_ID),
  }),
});

export const CheckResponseSchema = z.discriminatedUnion('status', [
  CheckOkSchema,
  CheckErrorSchema,
  CheckPaymentRequiredSchema,
]);

export const AccessResponseSchema = z.object({ holder: z.boolean() });

export type CheckOk = z.infer<typeof CheckOkSchema>;
export type CheckError = z.infer<typeof CheckErrorSchema>;
export type CheckPaymentRequired = z.infer<typeof CheckPaymentRequiredSchema>;
export type CheckResponse = z.infer<typeof CheckResponseSchema>;
export type AccessResponse = z.infer<typeof AccessResponseSchema>;
export type RiskFlag = z.infer<typeof RiskFlagSchema>;
export type Holder = z.infer<typeof HolderSchema>;
export type BurnEvent = z.infer<typeof BurnEventSchema>;
export type Source = z.infer<typeof SourceSchema>;
