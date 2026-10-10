/*
 * Arc mainnet, as documented on docs.arc.io and by Circle.
 * Testnet (5042002) is not supported. The RPC URL comes only from env (NEXT_PUBLIC_ARC_RPC_URL).
 */
export const ARC_CHAIN_ID = 5042;
export const ARC_CHAIN_ID_HEX = '0x13b2';
export const ARC_CHAIN_NAME = 'Arc';
export const ARC_EXPLORER_URL = 'https://explorer.arc.io';

/** USDC's ERC-20 interface on Arc. Balances are read here, with 6 decimals. */
export const ARC_USDC_ADDRESS = '0x3600000000000000000000000000000000000000';
export const ARC_USDC_DECIMALS = 6;

/** Native gas currency: USDC with 18 decimals. Only used when asking a wallet to add the chain. */
export const ARC_NATIVE_CURRENCY = { name: 'USDC', symbol: 'USDC', decimals: 18 } as const;
