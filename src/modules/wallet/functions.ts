import {
  BaseError,
  ResourceUnavailableRpcError,
  SwitchChainError,
  UserRejectedRequestError,
  formatUnits,
} from 'viem';

import { ARC_CHAIN_ID, ARC_USDC_DECIMALS } from '@/common/config/arc-chain';

const USER_REJECTED_CODE = UserRejectedRequestError.code;
const UNKNOWN_CHAIN_CODE = SwitchChainError.code;
const REQUEST_PENDING_CODE = ResourceUnavailableRpcError.code;

/** Error codes on an error and its causes (wallets nest them differently). */
const collectCodes = (error: unknown): number[] => {
  const codes: number[] = [];
  let current: unknown = error;
  for (let depth = 0; current && typeof current === 'object' && depth < 5; depth += 1) {
    const code: unknown = Reflect.get(current, 'code');
    if (typeof code === 'number') codes.push(code);
    current =
      current instanceof BaseError || 'cause' in current ? Reflect.get(current, 'cause') : null;
  }
  return codes;
};

export const isUserRejection = (error: unknown): boolean =>
  collectCodes(error).includes(USER_REJECTED_CODE);

/** The wallet already has a request from this site waiting for the user (-32002). */
export const isRequestPending = (error: unknown): boolean =>
  collectCodes(error).includes(REQUEST_PENDING_CODE);

/** The wallet doesn't know the chain yet (EIP-3326 error 4902), so it must be added first. */
export const isUnknownChain = (error: unknown): boolean =>
  collectCodes(error).includes(UNKNOWN_CHAIN_CODE);

export const isArcChain = (chainId: number | null): boolean => chainId === ARC_CHAIN_ID;

const HEX_PREFIX = /^0x/i;

/**
 * Chain id from a `chainChanged` event. EIP-1193 says hex string, but some wallets send a decimal
 * string or a number. Null when it can't be read.
 */
export const toChainId = (value: unknown): number | null => {
  const chainId =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseInt(value, HEX_PREFIX.test(value) ? 16 : 10)
        : Number.NaN;
  return Number.isSafeInteger(chainId) && chainId > 0 ? chainId : null;
};

/** MetaMask's "disconnect" while it reconnects to a chain (e.g. during a network switch). */
const RECONNECTING_CODE = 1013;

export const isReconnecting = (error: unknown): boolean =>
  collectCodes(error).includes(RECONNECTING_CODE);

const THOUSANDS = /\B(?=(\d{3})+(?!\d))/g;

/**
 * USDC balance from the ERC-20 interface: a bigint with 6 decimals, formatted as a string with
 * formatUnits so it is never converted to a JS number.
 */
export const formatUsdc = (balance: bigint): string => {
  const [whole = '0', fraction] = formatUnits(balance, ARC_USDC_DECIMALS).split('.');
  const grouped = whole.replace(THOUSANDS, ',');
  return fraction ? `${grouped}.${fraction}` : grouped;
};
