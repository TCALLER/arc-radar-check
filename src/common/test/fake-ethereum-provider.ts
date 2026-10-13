import { act } from '@testing-library/react';
import { vi } from 'vitest';

import type { EIP1193Provider } from 'viem';

type Handler = (params: unknown) => unknown;
type Listener = (...args: unknown[]) => void;

export const rpcError = (code: number): Error => Object.assign(new Error(`rpc ${code}`), { code });

/** A minimal injected EIP-1193 wallet for tests: scripted method handlers and emittable events. */
export const createFakeEthereumProvider = (handlers: Record<string, Handler>) => {
  const listeners = new Map<string, Set<Listener>>();
  const request = vi.fn(async ({ method, params }: { method: string; params?: unknown }) => {
    const handler = handlers[method];
    if (!handler) throw rpcError(4200);
    return handler(params);
  });
  const provider = {
    request,
    on: (event: string, listener: Listener) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)?.add(listener);
    },
    removeListener: (event: string, listener: Listener) => listeners.get(event)?.delete(listener),
  };
  const emit = (event: string, ...args: unknown[]) =>
    act(() => listeners.get(event)?.forEach((listener) => listener(...args)));

  // The test double implements only the methods this app calls.
  return { provider: provider as unknown as EIP1193Provider, request, emit };
};
