import { defineChain } from 'viem';

import {
  ARC_CHAIN_ID,
  ARC_CHAIN_NAME,
  ARC_EXPLORER_URL,
  ARC_NATIVE_CURRENCY,
} from '@/common/config/arc-chain';
import { env } from '@/common/config/env';

/** Arc mainnet for viem. Also the wallet_addEthereumChain parameters. */
export const arcChain = defineChain({
  id: ARC_CHAIN_ID,
  name: ARC_CHAIN_NAME,
  nativeCurrency: ARC_NATIVE_CURRENCY,
  rpcUrls: { default: { http: [env.NEXT_PUBLIC_ARC_RPC_URL] } },
  blockExplorers: { default: { name: 'Arc explorer', url: ARC_EXPLORER_URL } },
});

export const RPC_TIMEOUT_MS = 10_000;

/** After this long without an answer, a connect or switch request is shown as slow, with Cancel. */
export const WALLET_SLOW_MS = 10_000;

/** MetaMask fires this on window when it injects window.ethereum after the page has loaded. */
export const PROVIDER_INITIALIZED_EVENT = 'ethereum#initialized';
