import { queryOptions, skipToken } from '@tanstack/react-query';
import { createPublicClient, erc20Abi, http, type Address } from 'viem';

import { ARC_USDC_ADDRESS } from '@/common/config/arc-chain';

import { arcChain, RPC_TIMEOUT_MS } from './constants';
import { formatUsdc } from './functions';

const publicClient = createPublicClient({
  chain: arcChain,
  // No transport-level retries: TanStack Query owns retrying, so one failure isn't multiplied.
  transport: http(undefined, { timeout: RPC_TIMEOUT_MS, retryCount: 0 }),
});

export const walletKeys = {
  usdcBalance: (address: string) => ['usdc-balance', address.toLowerCase()] as const,
};

export const walletApi = {
  /** USDC via the ERC-20 interface at 0x3600…0000 (6 decimals), never the 18-decimal native balance. */
  getUsdcBalance: async (address: Address): Promise<string> =>
    formatUsdc(
      await publicClient.readContract({
        address: ARC_USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address],
      }),
    ),
};

export const walletQueries = {
  /** Only on Arc mainnet: on another network the balance isn't read. */
  usdcBalance: (address: Address | null, isOnArc: boolean) =>
    queryOptions({
      queryKey: walletKeys.usdcBalance(address ?? ''),
      queryFn: address && isOnArc ? () => walletApi.getUsdcBalance(address) : skipToken,
    }),
};
