import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { encodeAbiParameters } from 'viem';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createWrapper } from '@/common/test/render-with-providers';
import { server } from '@/common/test/server';
import { removeStorageItem, StorageKey } from '@/common/utils/global-utility';

import { useUsdcBalance, useWallet } from './hooks';

import type { EIP1193Provider } from 'viem';

vi.mock('@/common/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const ACCOUNT = '0x3f2a000000000000000000000000000000009c1d';
const OTHER_ACCOUNT = '0x4444444444444444444444444444444444444444';
const ARC_HEX = '0x13b2';
const ETHEREUM_HEX = '0x1';

type Handler = (params: unknown) => unknown;
type Listener = (...args: unknown[]) => void;

const rpcError = (code: number) => Object.assign(new Error(`rpc ${code}`), { code });

const createProvider = (handlers: Record<string, Handler>) => {
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
  return { provider: provider as unknown as EIP1193Provider, request, emit };
};

const methodsCalled = (request: ReturnType<typeof createProvider>['request']) =>
  request.mock.calls.map(([call]) => call.method);

const callFor = (request: ReturnType<typeof createProvider>['request'], method: string) =>
  request.mock.calls.map(([call]) => call).find((call) => call.method === method);

afterEach(() => {
  delete window.ethereum;
  removeStorageItem(StorageKey.WalletDisconnected);
});

describe('useWallet', () => {
  it('reports a missing wallet when connecting without a provider', async () => {
    const { result } = renderHook(() => useWallet());
    await act(() => result.current.connect());
    expect(result.current.status).toBe('noProvider');
  });

  it('connects and reads the chain', async () => {
    const { provider } = createProvider({
      eth_accounts: () => [],
      eth_requestAccounts: () => [ACCOUNT],
      eth_chainId: () => ARC_HEX,
    });
    window.ethereum = provider;
    const { result } = renderHook(() => useWallet());

    await act(() => result.current.connect());

    expect(result.current.status).toBe('connected');
    expect(result.current.address?.toLowerCase()).toBe(ACCOUNT);
    expect(result.current.isOnArc).toBe(true);
  });

  it('restores an existing connection without prompting', async () => {
    const { provider, request } = createProvider({
      eth_accounts: () => [ACCOUNT],
      eth_chainId: () => ETHEREUM_HEX,
    });
    window.ethereum = provider;
    const { result } = renderHook(() => useWallet());

    await waitFor(() => expect(result.current.status).toBe('connected'));
    expect(result.current.isOnArc).toBe(false);
    expect(methodsCalled(request)).not.toContain('eth_requestAccounts');
  });

  it('handles a rejected connection', async () => {
    const { provider } = createProvider({
      eth_accounts: () => [],
      eth_requestAccounts: () => {
        throw rpcError(4001);
      },
    });
    window.ethereum = provider;
    const { result } = renderHook(() => useWallet());

    await act(() => result.current.connect());

    expect(result.current).toMatchObject({ status: 'disconnected', error: 'rejected' });
  });

  it('recognises a connection request already waiting in the wallet', async () => {
    const { provider } = createProvider({
      eth_accounts: () => [],
      eth_requestAccounts: () => {
        throw rpcError(-32002);
      },
    });
    window.ethereum = provider;
    const { result } = renderHook(() => useWallet());

    await act(() => result.current.connect());

    expect(result.current).toMatchObject({ status: 'disconnected', error: 'pending' });
  });

  it('handles another connection failure', async () => {
    const { provider } = createProvider({
      eth_accounts: () => [],
      eth_requestAccounts: () => {
        throw rpcError(-32603);
      },
    });
    window.ethereum = provider;
    const { result } = renderHook(() => useWallet());

    await act(() => result.current.connect());

    expect(result.current).toMatchObject({ status: 'disconnected', error: 'failed' });
  });

  it('follows account changes, chain changes and disconnect', async () => {
    let accounts = [ACCOUNT];
    const { provider, emit } = createProvider({
      eth_accounts: () => accounts,
      eth_chainId: () => ARC_HEX,
    });
    window.ethereum = provider;
    const { result } = renderHook(() => useWallet());
    await waitFor(() => expect(result.current.status).toBe('connected'));

    emit('accountsChanged', [OTHER_ACCOUNT]);
    expect(result.current.address?.toLowerCase()).toBe(OTHER_ACCOUNT);

    emit('chainChanged', ETHEREUM_HEX);
    expect(result.current.isOnArc).toBe(false);

    emit('accountsChanged', []);
    expect(result.current.status).toBe('disconnected');

    emit('accountsChanged', [ACCOUNT]);
    // The wallet really let go of the site: no account left.
    accounts = [];
    emit('disconnect');
    await waitFor(() => expect(result.current.address).toBeNull());
  });

  it('switches to Arc when the wallet knows the chain', async () => {
    const { provider, request } = createProvider({
      eth_accounts: () => [],
      wallet_switchEthereumChain: () => null,
    });
    window.ethereum = provider;
    const { result } = renderHook(() => useWallet());

    await act(() => result.current.switchToArc());

    expect(callFor(request, 'wallet_switchEthereumChain')?.params).toEqual([{ chainId: ARC_HEX }]);
    expect(methodsCalled(request)).not.toContain('wallet_addEthereumChain');
  });

  it('adds Arc with its chain parameters when the wallet reports 4902', async () => {
    const { provider, request } = createProvider({
      eth_accounts: () => [],
      wallet_switchEthereumChain: () => {
        throw rpcError(4902);
      },
      wallet_addEthereumChain: () => null,
    });
    window.ethereum = provider;
    const { result } = renderHook(() => useWallet());

    await act(() => result.current.switchToArc());

    expect(callFor(request, 'wallet_addEthereumChain')?.params).toEqual([
      expect.objectContaining({
        chainId: ARC_HEX,
        chainName: 'Arc',
        nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
        rpcUrls: ['https://rpc.test.local'],
        blockExplorerUrls: ['https://explorer.arc.io'],
      }),
    ]);
  });

  it('marks a network switch as waiting until the wallet answers', async () => {
    let answer: (value: null) => void = () => {};
    const { provider } = createProvider({
      eth_accounts: () => [],
      wallet_switchEthereumChain: () =>
        new Promise((resolve) => {
          answer = resolve;
        }),
    });
    window.ethereum = provider;
    const { result } = renderHook(() => useWallet());

    let switching: Promise<void> = Promise.resolve();
    act(() => {
      switching = result.current.switchToArc();
    });
    await waitFor(() => expect(result.current.isSwitching).toBe(true));

    await act(async () => {
      answer(null);
      await switching;
    });
    expect(result.current.isSwitching).toBe(false);
  });

  it('clears an earlier request error once an account connects', async () => {
    const { provider, emit } = createProvider({
      eth_accounts: () => [],
      eth_requestAccounts: () => {
        throw rpcError(-32002);
      },
    });
    window.ethereum = provider;
    const { result } = renderHook(() => useWallet());
    await act(() => result.current.connect());
    expect(result.current.error).toBe('pending');

    emit('accountsChanged', [ACCOUNT]);

    expect(result.current).toMatchObject({ status: 'connected', error: null });
  });

  it('records a rejected network switch', async () => {
    const { provider } = createProvider({
      eth_accounts: () => [],
      wallet_switchEthereumChain: () => {
        throw rpcError(4001);
      },
    });
    window.ethereum = provider;
    const { result } = renderHook(() => useWallet());

    await act(() => result.current.switchToArc());

    expect(result.current.error).toBe('rejected');
  });
});

describe('useWallet disconnect', () => {
  it('forgets the wallet, asks it to revoke access, and stays disconnected after a reload', async () => {
    const { provider, request } = createProvider({
      eth_accounts: () => [ACCOUNT],
      eth_chainId: () => ARC_HEX,
      wallet_revokePermissions: () => null,
    });
    window.ethereum = provider;
    const first = renderHook(() => useWallet());
    await waitFor(() => expect(first.result.current.status).toBe('connected'));

    await act(() => first.result.current.disconnect());

    expect(first.result.current).toMatchObject({ status: 'disconnected', address: null });
    expect(methodsCalled(request)).toContain('wallet_revokePermissions');
    first.unmount();

    // A new visit doesn't reconnect silently, even though the wallet still reports the account.
    request.mockClear();
    const second = renderHook(() => useWallet());
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(second.result.current.status).toBe('disconnected');
    expect(methodsCalled(request)).not.toContain('eth_accounts');
  });

  it('still disconnects when the wallet does not support revoking', async () => {
    const { provider } = createProvider({
      eth_accounts: () => [ACCOUNT],
      eth_chainId: () => ARC_HEX,
    });
    window.ethereum = provider;
    const { result } = renderHook(() => useWallet());
    await waitFor(() => expect(result.current.status).toBe('connected'));

    await act(() => result.current.disconnect());

    expect(result.current.status).toBe('disconnected');
  });

  it('connects again after an explicit Connect', async () => {
    const { provider } = createProvider({
      eth_accounts: () => [],
      eth_requestAccounts: () => [ACCOUNT],
      eth_chainId: () => ARC_HEX,
      wallet_revokePermissions: () => null,
    });
    window.ethereum = provider;
    const { result } = renderHook(() => useWallet());
    await act(() => result.current.disconnect());

    await act(() => result.current.connect());

    expect(result.current.status).toBe('connected');
  });
});

describe('useWallet when the wallet does not answer', () => {
  // A request that never settles, like a phone wallet that shows no prompt.
  const never = () => new Promise<never>(() => {});

  afterEach(() => vi.useRealTimers());

  it('marks a connect request as slow after 10 s, and Cancel goes back to Connect', async () => {
    vi.useFakeTimers();
    const { provider } = createProvider({
      eth_accounts: () => [],
      eth_requestAccounts: never,
      eth_chainId: () => ARC_HEX,
    });
    window.ethereum = provider;
    const { result } = renderHook(() => useWallet());

    act(() => void result.current.connect());
    expect(result.current.status).toBe('connecting');
    expect(result.current.isSlow).toBe(false);

    act(() => vi.advanceTimersByTime(10_000));
    expect(result.current.isSlow).toBe(true);

    act(() => result.current.cancelRequest());
    expect(result.current.status).toBe('disconnected');
    expect(result.current.isSlow).toBe(false);
  });

  it('ignores the answer of a cancelled connect request', async () => {
    let answer: (accounts: string[]) => void = () => {};
    const { provider } = createProvider({
      eth_accounts: () => [],
      eth_requestAccounts: () => new Promise((resolve) => (answer = resolve)),
      eth_chainId: () => ARC_HEX,
    });
    window.ethereum = provider;
    const { result } = renderHook(() => useWallet());

    act(() => void result.current.connect());
    await waitFor(() => expect(result.current.status).toBe('connecting'));
    act(() => result.current.cancelRequest());
    await act(async () => answer([]));

    expect(result.current.status).toBe('disconnected');
    expect(result.current.error).toBeNull();
  });

  it('connects from accountsChanged when the request itself never answers, and reads the chain', async () => {
    const { provider, emit } = createProvider({
      eth_accounts: () => [],
      eth_requestAccounts: never,
      eth_chainId: () => ARC_HEX,
    });
    window.ethereum = provider;
    const { result } = renderHook(() => useWallet());

    act(() => void result.current.connect());
    emit('accountsChanged', [ACCOUNT]);

    await waitFor(() => expect(result.current.isOnArc).toBe(true));
    expect(result.current.status).toBe('connected');
  });

  it('asks the wallet again when the page becomes visible (approved in the wallet app)', async () => {
    let approved = false;
    const { provider } = createProvider({
      eth_accounts: () => (approved ? [ACCOUNT] : []),
      eth_requestAccounts: never,
      eth_chainId: () => ARC_HEX,
    });
    window.ethereum = provider;
    const { result } = renderHook(() => useWallet());

    act(() => void result.current.connect());
    await waitFor(() => expect(result.current.status).toBe('connecting'));
    approved = true;
    act(() => void document.dispatchEvent(new Event('visibilitychange')));

    await waitFor(() => expect(result.current.status).toBe('connected'));
    expect(result.current.address?.toLowerCase()).toBe(ACCOUNT);
  });

  it('keeps waiting when the wallet still has no account on return', async () => {
    const { provider } = createProvider({
      eth_accounts: () => [],
      eth_requestAccounts: never,
      eth_chainId: () => ARC_HEX,
    });
    window.ethereum = provider;
    const { result } = renderHook(() => useWallet());

    act(() => void result.current.connect());
    act(() => void window.dispatchEvent(new Event('focus')));

    await waitFor(() => expect(result.current.status).toBe('connecting'));
  });

  it('ends a silent network switch when the wallet reports Arc', async () => {
    const { provider, emit } = createProvider({
      eth_accounts: () => [ACCOUNT],
      eth_chainId: () => ETHEREUM_HEX,
      wallet_switchEthereumChain: never,
    });
    window.ethereum = provider;
    const { result } = renderHook(() => useWallet());
    await waitFor(() => expect(result.current.status).toBe('connected'));

    act(() => void result.current.switchToArc());
    await waitFor(() => expect(result.current.isSwitching).toBe(true));
    emit('chainChanged', ARC_HEX);

    expect(result.current.isSwitching).toBe(false);
    expect(result.current.isOnArc).toBe(true);
  });

  it('cancels a silent network switch and keeps the wallet connected', async () => {
    const { provider, emit } = createProvider({
      eth_accounts: () => [ACCOUNT],
      eth_chainId: () => ETHEREUM_HEX,
      wallet_switchEthereumChain: never,
    });
    window.ethereum = provider;
    const { result } = renderHook(() => useWallet());
    await waitFor(() => expect(result.current.status).toBe('connected'));

    act(() => void result.current.switchToArc());
    await waitFor(() => expect(result.current.isSwitching).toBe(true));
    // An account change during the switch must not end the switch.
    emit('accountsChanged', [OTHER_ACCOUNT]);
    expect(result.current.isSwitching).toBe(true);

    act(() => result.current.cancelRequest());
    expect(result.current.isSwitching).toBe(false);
    expect(result.current.status).toBe('connected');
  });

  it('picks up a wallet injected after the page loaded', async () => {
    const { result } = renderHook(() => useWallet());
    const { provider } = createProvider({
      eth_accounts: () => [],
      eth_requestAccounts: () => [ACCOUNT],
      eth_chainId: () => ARC_HEX,
    });
    window.ethereum = provider;
    act(() => void window.dispatchEvent(new Event('ethereum#initialized')));

    await act(() => result.current.connect());
    expect(result.current.status).toBe('connected');
  });
});

describe('useWallet: unusual wallet behaviour', () => {
  it('lets a wallet that appears after "no wallet found" be used', async () => {
    const { result } = renderHook(() => useWallet());
    await act(() => result.current.connect());
    expect(result.current.status).toBe('noProvider');

    window.ethereum = createProvider({ eth_accounts: () => [] }).provider;
    act(() => void window.dispatchEvent(new Event('ethereum#initialized')));

    await waitFor(() => expect(result.current.status).toBe('disconnected'));
  });

  it('reads chain ids sent as hex, decimal strings or numbers, and ignores unreadable ones', async () => {
    const { provider, emit } = createProvider({
      eth_accounts: () => [ACCOUNT],
      eth_chainId: () => ETHEREUM_HEX,
    });
    window.ethereum = provider;
    const { result } = renderHook(() => useWallet());
    await waitFor(() => expect(result.current.status).toBe('connected'));

    emit('chainChanged', '5042');
    expect(result.current.isOnArc).toBe(true);
    emit('chainChanged', 1);
    expect(result.current.chainId).toBe(1);
    emit('chainChanged', 'not a chain');
    expect(result.current.chainId).toBe(1);
  });

  it('ignores an account change without a valid address', async () => {
    const { provider, emit } = createProvider({
      eth_accounts: () => [ACCOUNT],
      eth_chainId: () => ARC_HEX,
    });
    window.ethereum = provider;
    const { result } = renderHook(() => useWallet());
    await waitFor(() => expect(result.current.status).toBe('connected'));

    emit('accountsChanged', ['not-an-address']);

    expect(result.current.status).toBe('disconnected');
  });

  it('keeps the wallet through a "reconnecting" disconnect and while it still has the account', async () => {
    let accounts = [ACCOUNT];
    const { provider, emit } = createProvider({
      eth_accounts: () => accounts,
      eth_chainId: () => ARC_HEX,
    });
    window.ethereum = provider;
    const { result } = renderHook(() => useWallet());
    await waitFor(() => expect(result.current.status).toBe('connected'));

    emit('disconnect', rpcError(1013));
    emit('disconnect', rpcError(4900));
    await act(async () => {});
    expect(result.current.status).toBe('connected');

    accounts = [];
    emit('disconnect', rpcError(4900));
    await waitFor(() => expect(result.current.status).toBe('disconnected'));
  });

  it('reads the network after a switch when the wallet sends no chainChanged', async () => {
    let chain = ETHEREUM_HEX;
    const { provider } = createProvider({
      eth_accounts: () => [ACCOUNT],
      eth_chainId: () => chain,
      wallet_switchEthereumChain: () => {
        chain = ARC_HEX;
        return null;
      },
    });
    window.ethereum = provider;
    const { result } = renderHook(() => useWallet());
    await waitFor(() => expect(result.current.status).toBe('connected'));

    await act(() => result.current.switchToArc());

    expect(result.current.isOnArc).toBe(true);
    expect(result.current.isSwitching).toBe(false);
  });

  it('switches again when the wallet adds Arc without switching to it', async () => {
    let chain = ETHEREUM_HEX;
    let arcKnown = false;
    const { provider, request } = createProvider({
      eth_accounts: () => [ACCOUNT],
      eth_chainId: () => chain,
      wallet_switchEthereumChain: () => {
        if (!arcKnown) throw rpcError(4902);
        chain = ARC_HEX;
        return null;
      },
      wallet_addEthereumChain: () => {
        arcKnown = true;
        return null;
      },
    });
    window.ethereum = provider;
    const { result } = renderHook(() => useWallet());
    await waitFor(() => expect(result.current.status).toBe('connected'));

    await act(() => result.current.switchToArc());

    expect(methodsCalled(request).filter((m) => m === 'wallet_switchEthereumChain')).toHaveLength(
      2,
    );
    expect(result.current.isOnArc).toBe(true);
  });

  it('works with a wallet object that cannot send events', async () => {
    window.ethereum = {
      request: vi.fn(async ({ method }: { method: string }) => {
        if (method === 'eth_accounts') return [];
        if (method === 'eth_requestAccounts') return [ACCOUNT];
        if (method === 'eth_chainId') return ARC_HEX;
        throw rpcError(4200);
      }),
    } as unknown as EIP1193Provider;
    const { result } = renderHook(() => useWallet());

    await act(() => result.current.connect());

    expect(result.current.status).toBe('connected');
  });
});

describe('useUsdcBalance', () => {
  const RPC = 'https://rpc.test.local/';
  const respondWithBalance = (balance: bigint) =>
    server.use(
      http.post(RPC, async ({ request }) => {
        const body = (await request.json()) as {
          id: number;
          method: string;
          params: [{ to: string }];
        };
        expect(body.method).toBe('eth_call');
        expect(body.params[0].to.toLowerCase()).toBe('0x3600000000000000000000000000000000000000');
        return HttpResponse.json({
          jsonrpc: '2.0',
          id: body.id,
          result: encodeAbiParameters([{ type: 'uint256' }], [balance]),
        });
      }),
    );

  it('reads the ERC-20 balance with 6 decimals', async () => {
    respondWithBalance(42_180_000n);
    const { result } = renderHook(() => useUsdcBalance(ACCOUNT, true), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.data).toBe('42.18'));
  });

  it('does not read the balance on another network', () => {
    const { result } = renderHook(() => useUsdcBalance(ACCOUNT, false), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('reports an RPC error', async () => {
    server.use(
      http.post(RPC, () =>
        HttpResponse.json({ jsonrpc: '2.0', id: 1, error: { code: -32000, message: 'down' } }),
      ),
    );
    const { result } = renderHook(() => useUsdcBalance(ACCOUNT, true), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
