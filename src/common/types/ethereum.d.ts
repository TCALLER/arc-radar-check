import type { EIP1193Provider } from 'viem';

declare global {
  interface Window {
    /** Injected EIP-1193 wallet provider (browser extension or in-app wallet browser). */
    ethereum?: EIP1193Provider;
  }
}

export {};
