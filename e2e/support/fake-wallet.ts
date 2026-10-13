import type { BrowserContext, Page } from '@playwright/test';

export const WALLET_ACCOUNT = '0x74a004ff29bc3972d09fd00000000000007cb98a';
export const OTHER_ACCOUNT = '0x4444444444444444444444444444444444444444';
export const ARC_CHAIN_HEX = '0x13b2';
export const ETHEREUM_CHAIN_HEX = '0x1';
const RPC_URL = 'https://rpc.test.local/**';

type FakeWalletOptions = {
  chainId?: string;
  rejectConnect?: boolean;
  /** The wallet doesn't know Arc yet: switching fails with 4902 until it is added. */
  unknownArc?: boolean;
  /**
   * Like a phone wallet that shows no prompt: eth_requestAccounts never answers. The test can
   * still "approve" in the wallet with approveSilently(), which only changes eth_accounts.
   */
  silentConnect?: boolean;
};

type FakeWalletCall = { method: string; params?: unknown };

/**
 * Injects a scripted EIP-1193 wallet (window.ethereum) before the page loads, like a browser
 * extension would. Calls are recorded on window.__fakeWallet for assertions.
 */
export const installFakeWallet = async (page: Page, options: FakeWalletOptions = {}) => {
  await page.addInitScript(
    ({ account, chainId, rejectConnect, unknownArc, silentConnect }) => {
      const listeners: Record<string, Set<(...args: unknown[]) => void>> = {};
      const calls: FakeWalletCall[] = [];
      let connected = false;
      let currentChain = chainId;
      let arcAdded = !unknownArc;
      const emit = (event: string, ...args: unknown[]) =>
        listeners[event]?.forEach((listener) => listener(...args));
      const rpcError = (code: number, message: string) =>
        Object.assign(new Error(message), { code });

      const provider = {
        isMetaMask: true,
        request: async ({ method, params }: FakeWalletCall) => {
          calls.push({ method, params });
          switch (method) {
            case 'eth_accounts':
              return connected ? [account] : [];
            case 'eth_requestAccounts':
              if (rejectConnect) throw rpcError(4001, 'User rejected the request.');
              if (silentConnect) return new Promise(() => {});
              connected = true;
              return [account];
            case 'eth_chainId':
              return currentChain;
            case 'wallet_switchEthereumChain': {
              const [{ chainId: target }] = params as [{ chainId: string }];
              if (!arcAdded) throw rpcError(4902, 'Unrecognized chain ID.');
              currentChain = target;
              emit('chainChanged', target);
              return null;
            }
            case 'wallet_revokePermissions':
              connected = false;
              return null;
            case 'wallet_addEthereumChain': {
              const [{ chainId: target }] = params as [{ chainId: string }];
              arcAdded = true;
              currentChain = target;
              emit('chainChanged', target);
              return null;
            }
            default:
              throw rpcError(4200, `Unsupported method ${method}`);
          }
        },
        on: (event: string, listener: (...args: unknown[]) => void) => {
          (listeners[event] ??= new Set()).add(listener);
        },
        removeListener: (event: string, listener: (...args: unknown[]) => void) => {
          listeners[event]?.delete(listener);
        },
      };

      const approveSilently = () => {
        connected = true;
      };
      Object.assign(window, { ethereum: provider, __fakeWallet: { calls, emit, approveSilently } });
    },
    {
      account: WALLET_ACCOUNT,
      chainId: options.chainId ?? ARC_CHAIN_HEX,
      rejectConnect: options.rejectConnect ?? false,
      unknownArc: options.unknownArc ?? false,
      silentConnect: options.silentConnect ?? false,
    },
  );
};

export const getWalletCalls = (page: Page): Promise<FakeWalletCall[]> =>
  page.evaluate(
    () => (window as unknown as { __fakeWallet: { calls: FakeWalletCall[] } }).__fakeWallet.calls,
  );

export const emitWalletEvent = (page: Page, event: string, ...args: unknown[]) =>
  page.evaluate(
    ({ name, values }) =>
      (
        window as unknown as { __fakeWallet: { emit: (e: string, ...a: unknown[]) => void } }
      ).__fakeWallet.emit(name, ...values),
    { name: event, values: args },
  );

/** The user approves in the wallet app, but the page's request never gets the answer. */
export const approveSilently = (page: Page) =>
  page.evaluate(() =>
    (
      window as unknown as { __fakeWallet: { approveSilently: () => void } }
    ).__fakeWallet.approveSilently(),
  );

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
};

/** Answers the Arc RPC (balanceOf on the USDC ERC-20) with a fixed balance, or fails. */
export const mockArcRpc = async (
  context: BrowserContext,
  { balance = 42_180_000n, fail = false }: { balance?: bigint; fail?: boolean } = {},
) => {
  await context.route(RPC_URL, async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS_HEADERS });
      return;
    }
    if (fail) {
      await route.fulfill({ status: 503, headers: CORS_HEADERS, body: '' });
      return;
    }
    const { id } = request.postDataJSON() as { id: number };
    await route.fulfill({
      status: 200,
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id,
        result: `0x${balance.toString(16).padStart(64, '0')}`,
      }),
    });
  });
};
