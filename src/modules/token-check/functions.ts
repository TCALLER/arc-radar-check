import { ApiError } from '@/common/api/api-error';
import { assertNever, toSafeDisplayText } from '@/common/utils/global-utility';

import { DEV_STATE_PARAM, TOKEN_PARAM, VERDICT_LABELS } from './constants';
import { CheckStatus } from './schema';
import { TokenAddressSchema } from './validation';

import type { CheckOk, CheckResponse, Holder } from './schema';
import type { AccessState, CheckView, ClaimTone } from './types';
import type { WalletStatus } from '@/modules/wallet';

const THOUSANDS = /\B(?=(\d{3})+(?!\d))/g;
const DIGITS_ONLY = /^\d+$/;
const ADDRESS_HEAD = 6;
const ADDRESS_TAIL = 4;

/**
 * Adds thousands separators to a string of digits without converting it to a number, so values
 * beyond Number.MAX_SAFE_INTEGER stay exact. Never scales by `decimals`.
 */
export const formatIntegerString = (value: string): string =>
  DIGITS_ONLY.test(value) ? value.replace(THOUSANDS, ',') : value;

const countFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

export const formatCount = (value: number): string => countFormatter.format(value);

/** The API's percentage as given (no rounding), e.g. 58.4 → "58.4%". */
export const formatPercent = (value: number): string => `${value}%`;

/** 0x2222…2222. Display only. */
export const shortenAddress = (address: string): string =>
  address.length > ADDRESS_HEAD + ADDRESS_TAIL + 1
    ? `${address.slice(0, ADDRESS_HEAD)}…${address.slice(-ADDRESS_TAIL)}`
    : address;

export const pluralize = (count: number, singular: string, plural: string): string =>
  count === 1 ? singular : plural;

type Claim = { claimed: boolean; verified: boolean };

/** Claims written as facts. */
export const describeClaim = ({ claimed, verified }: Claim): { text: string; tone: ClaimTone } => {
  if (!claimed) return { text: 'Not claimed', tone: 'muted' };
  if (verified) return { text: 'Claimed and verified on-chain', tone: 'ok' };
  return { text: 'Claimed, not confirmed on-chain', tone: 'caution' };
};

type Burns = NonNullable<CheckOk['burns']>;

/** One sentence built only from burn values in the response. */
export const describeBurns = (burns: Burns): string => {
  if (!burns.claimed && burns.total_burned === '0') return "The project doesn't claim burns.";
  const amount = `${formatIntegerString(burns.total_burned)} tokens burned, ${formatPercent(burns.burned_pct_of_supply)} of supply.`;
  return burns.events.length === 0 ? `${amount} No burn transactions found.` : amount;
};

/** Whether to draw the burn supply bar: there is a claim or something was burned. */
export const hasBurnBar = (burns: Burns): boolean => burns.claimed || burns.total_burned !== '0';

type Buybacks = NonNullable<CheckOk['buybacks']>;

/** The API note, or a fact derived from `claimed: false` when there is no note. */
export const describeBuybackNote = (buybacks: Buybacks): string | null => {
  if (buybacks.note !== null) return buybacks.note;
  return buybacks.claimed ? null : "The project doesn't claim to buy back tokens.";
};

/** Whether any holder label lost hidden or text-direction characters (drives the one note). */
export const countCleanedLabels = (holders: readonly Holder[]): number =>
  holders.filter(
    (holder) => holder.label !== null && toSafeDisplayText(holder.label).hadHiddenChars,
  ).length;

export const describeCleanedLabels = (count: number): string | null => {
  if (count === 0) return null;
  return count === 1
    ? 'One label had hidden text-direction characters. We removed them.'
    : `${count} labels had hidden text-direction characters. We removed them.`;
};

// Angle brackets: HTML-like text such as <script> in token metadata.
const CODE_LIKE = /[<>]/;

/** Whether any of these untrusted strings looks like code (drives the "shown as text" note). */
export const hasCodeLikeText = (...values: readonly string[]): boolean =>
  values.some((value) => CODE_LIKE.test(value));

const MAX_BLIPS = 8;

/** Index into the result timeline delay tables: the number of blips the radar draws. */
export const toTimelineIndex = (flagCount: number): number => Math.min(flagCount, MAX_BLIPS);

/**
 * What the page's polite live region says. Errors are announced by
 * their own role="alert" message, so they return an empty string here.
 */
export const toAnnouncement = (view: CheckView): string => {
  if (view.kind === 'scanning') return 'Scanning Arc…';
  if (view.kind !== 'result') return '';
  const count = view.data.risk_flags.length;
  const verdict = VERDICT_LABELS[view.data.verdict.level];
  return `Result: ${verdict}. ${count === 0 ? 'No' : count} ${pluralize(count, 'warning sign', 'warning signs')} found.`;
};

type CheckQueryState = {
  data: CheckResponse | undefined;
  error: unknown;
  isFetching: boolean;
};

/** Maps the check query to what the screen shows. Pure, so every state is unit tested. */
export const toCheckView = (address: string | null, query: CheckQueryState): CheckView => {
  if (!address) return { kind: 'idle' };
  if (query.isFetching) return { kind: 'scanning' };
  if (query.error) {
    return query.error instanceof ApiError && query.error.isTimeout
      ? { kind: 'timeout' }
      : { kind: 'failed' };
  }
  if (!query.data) return { kind: 'scanning' };

  switch (query.data.status) {
    case CheckStatus.Ok:
      return { kind: 'result', data: query.data };
    case CheckStatus.Error:
      return { kind: 'apiError', message: query.data.error.message };
    case CheckStatus.PaymentRequired:
      return { kind: 'payment', priceUsdc: query.data.payment.price_usdc };
    default:
      return assertNever(query.data);
  }
};

type WalletForAccess = { status: WalletStatus; address: string | null };
type AccessQueryState = {
  data: { holder: boolean } | undefined;
  error: unknown;
  isFetching: boolean;
};

/**
 * The access flow. No wallet → locked (no call). Pending → checking (still locked).
 * Failure → failed (still locked: never unlock on failure). Only `holder: true` unlocks.
 */
export const toAccessState = (wallet: WalletForAccess, access: AccessQueryState): AccessState => {
  if (wallet.status === 'noProvider') return 'noWallet';
  if (wallet.status === 'connecting') return 'connecting';
  if (!wallet.address) return 'locked';
  if (access.isFetching) return 'checking';
  if (access.error) return 'failed';
  if (!access.data) return 'checking';
  return access.data.holder ? 'holder' : 'notHolder';
};

/**
 * The page link to continue in another browser (wallet app, outside Telegram): it carries the
 * checked token so the check opens straight away there. Drops the dev state switch and the
 * `#…` fragment: inside Telegram it holds the signed launch data (`tgWebAppData`), which would make
 * the opened page act as the Mini App and would leak the user's Telegram data in a copied link.
 */
export const toShareUrl = (href: string, address: string | null): string => {
  const url = new URL(href);
  url.hash = '';
  url.searchParams.delete(DEV_STATE_PARAM);
  if (address) url.searchParams.set(TOKEN_PARAM, address);
  return url.href;
};

/** The `?token=` from a shared link, only when it is a valid address (untrusted input). */
export const readLinkedToken = (value: string | null): string | null => {
  if (value === null) return null;
  const parsed = TokenAddressSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

/**
 * Header badge: "Mock version" whenever the app runs on mocked data, and no badge on the live
 * API. A live response still marked `sample: true` shows "Sample data" (as the README asks).
 */
export const toDataBadge = (isMocking: boolean, isSampleResponse: boolean): string | null => {
  if (isMocking) return 'Mock version';
  return isSampleResponse ? 'Sample data' : null;
};
