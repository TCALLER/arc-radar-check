import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { useQuery } from '@tanstack/react-query';
import {
  createWalletClient,
  custom,
  getAddress,
  isAddress,
  type Address,
  type EIP1193Provider,
} from 'viem';

import {
  getStorageItem,
  removeStorageItem,
  setStorageItem,
  StorageKey,
} from '@/common/utils/global-utility';
import { logger } from '@/common/utils/logger';

import { walletQueries } from './api';
import { arcChain, PROVIDER_INITIALIZED_EVENT, WALLET_SLOW_MS } from './constants';
import {
  isArcChain,
  isReconnecting,
  isRequestPending,
  isUnknownChain,
  isUserRejection,
  toChainId,
} from './functions';

import type { WalletError, WalletState } from './types';

type RequestKind = 'connect' | 'switch';

const DISCONNECTED: WalletState = {
  status: 'disconnected',
  address: null,
  chainId: null,
  error: null,
  isSwitching: false,
  isSlow: false,
};

const getProvider = (): EIP1193Provider | null =>
  typeof window === 'undefined' ? null : (window.ethereum ?? null);

// Some injected objects can't send events; requests still work, only live updates are missing.
const canListen = (provider: EIP1193Provider): boolean =>
  typeof provider.on === 'function' && typeof provider.removeListener === 'function';

// Most wallets inject before the page loads; MetaMask announces a late injection with an event.
const subscribeProvider = (onChange: () => void) => {
  window.addEventListener(PROVIDER_INITIALIZED_EVENT, onChange);
  return () => window.removeEventListener(PROVIDER_INITIALIZED_EVENT, onChange);
};

const createClient = (provider: EIP1193Provider) =>
  createWalletClient({ chain: arcChain, transport: custom(provider, { retryCount: 0 }) });

const toWalletError = (error: unknown): WalletError => {
  if (isUserRejection(error)) return 'rejected';
  // MetaMask -32002: a request from this site is already open and must be answered first.
  if (isRequestPending(error)) return 'pending';
  return 'failed';
};

/**
 * The injected EIP-1193 wallet through viem. No WalletConnect.
 * A connection or balance is display-only, never proof of holding or payment.
 *
 * Phone wallets sometimes never answer a request (no prompt appears, or the answer is lost while
 * the user is in the wallet app), so a request is never waited on blindly: it turns slow after
 * WALLET_SLOW_MS, can be cancelled, and the wallet is asked again when the page becomes visible.
 */
export const useWallet = () => {
  const provider = useSyncExternalStore(subscribeProvider, getProvider, () => null);
  const [state, setState] = useState<WalletState>(DISCONNECTED);
  // Each connect or switch gets an id; a cancelled or replaced request no longer changes state.
  const requestRef = useRef<{ id: number; kind: RequestKind | null }>({ id: 0, kind: null });

  const beginRequest = useCallback((kind: RequestKind) => {
    const id = requestRef.current.id + 1;
    requestRef.current = { id, kind };
    return () => requestRef.current.id === id;
  }, []);
  /** Drops the open request, or only a request of `kind` when given. */
  const endRequest = useCallback((kind?: RequestKind) => {
    if (kind && requestRef.current.kind !== kind) return;
    requestRef.current = { id: requestRef.current.id + 1, kind: null };
  }, []);

  const isConnecting = state.status === 'connecting';
  const isWaiting = isConnecting || state.isSwitching;

  useEffect(() => {
    if (!provider) return;
    const client = createClient(provider);
    // A wallet that appeared after "no wallet found" (late injection) can be used now.
    setState((current) => (current.status === 'noProvider' ? DISCONNECTED : current));

    // Restore an existing connection silently (eth_accounts never prompts), unless the user
    // disconnected here: then wait for an explicit Connect.
    const wasDisconnected = getStorageItem<boolean>(StorageKey.WalletDisconnected) === true;
    if (!wasDisconnected) {
      Promise.all([client.getAddresses(), client.getChainId()])
        .then(([addresses, chainId]) => {
          const [address] = addresses;
          if (address) setState({ ...DISCONNECTED, status: 'connected', address, chainId });
        })
        .catch((error: unknown) => logger.warn('Wallet restore failed', error));
    }

    const handleAccountsChanged = (accounts: readonly string[]) => {
      const account = accounts.find((candidate) => isAddress(candidate, { strict: false }));
      if (account && getStorageItem<boolean>(StorageKey.WalletDisconnected) === true) return;
      if (!account) {
        setState(DISCONNECTED);
        return;
      }
      // Also ends a connect request whose own answer never arrived, and clears an old message.
      endRequest('connect');
      setState((current) => ({
        ...current,
        status: 'connected',
        address: getAddress(account),
        error: null,
      }));
      client
        .getChainId()
        .then((chainId) =>
          setState((current) => (current.chainId === null ? { ...current, chainId } : current)),
        )
        .catch((error: unknown) => logger.warn('Reading the wallet network failed', error));
    };
    const handleChainChanged = (value: unknown) => {
      const chainId = toChainId(value);
      if (chainId === null) return;
      // Reaching Arc ends a switch even when the switch request's own answer never arrives.
      setState((current) => ({
        ...current,
        chainId,
        isSwitching: isArcChain(chainId) ? false : current.isSwitching,
      }));
    };
    // MetaMask mobile can report "disconnect" while it switches networks: only forget the wallet
    // when it really has no account for this site any more.
    const handleDisconnect = (error?: unknown) => {
      if (isReconnecting(error)) return;
      client
        .getAddresses()
        .then(([address]) => {
          if (!address) setState(DISCONNECTED);
        })
        .catch(() => setState(DISCONNECTED));
    };

    if (!canListen(provider)) return;
    provider.on('accountsChanged', handleAccountsChanged);
    provider.on('chainChanged', handleChainChanged);
    provider.on('disconnect', handleDisconnect);
    return () => {
      provider.removeListener('accountsChanged', handleAccountsChanged);
      provider.removeListener('chainChanged', handleChainChanged);
      provider.removeListener('disconnect', handleDisconnect);
    };
  }, [provider, endRequest]);

  // A request without an answer turns slow, so the page can offer Cancel.
  useEffect(() => {
    if (!isWaiting) return;
    const timer = setTimeout(
      () => setState((current) => ({ ...current, isSlow: true })),
      WALLET_SLOW_MS,
    );
    return () => {
      clearTimeout(timer);
      setState((current) => (current.isSlow ? { ...current, isSlow: false } : current));
    };
  }, [isWaiting]);

  // Back from the wallet app: ask again, in case it approved but the answer was lost.
  useEffect(() => {
    if (!provider || !isWaiting) return;
    const client = createClient(provider);
    const recheck = () => {
      if (document.visibilityState !== 'visible') return;
      Promise.all([client.getAddresses(), client.getChainId()])
        .then(([[address], chainId]) => {
          if (isConnecting && address) {
            endRequest('connect');
            setState({ ...DISCONNECTED, status: 'connected', address, chainId });
          } else if (!isConnecting && isArcChain(chainId)) {
            endRequest('switch');
            setState((current) => ({ ...current, chainId, isSwitching: false }));
          }
        })
        .catch((error: unknown) => logger.warn('Wallet re-check failed', error));
    };
    document.addEventListener('visibilitychange', recheck);
    window.addEventListener('focus', recheck);
    return () => {
      document.removeEventListener('visibilitychange', recheck);
      window.removeEventListener('focus', recheck);
    };
  }, [provider, isWaiting, isConnecting, endRequest]);

  const connect = useCallback(async () => {
    if (!provider) {
      setState({ ...DISCONNECTED, status: 'noProvider' });
      return;
    }
    const isCurrent = beginRequest('connect');
    setState({ ...DISCONNECTED, status: 'connecting' });
    removeStorageItem(StorageKey.WalletDisconnected);
    try {
      const client = createClient(provider);
      const [address] = await client.requestAddresses();
      const chainId = await client.getChainId();
      if (!isCurrent()) return;
      setState(address ? { ...DISCONNECTED, status: 'connected', address, chainId } : DISCONNECTED);
    } catch (error) {
      if (!isCurrent()) return;
      logger.warn('Wallet connection failed', error);
      setState({ ...DISCONNECTED, error: toWalletError(error) });
    }
  }, [provider, beginRequest]);

  /** wallet_switchEthereumChain, falling back to wallet_addEthereumChain on 4902. */
  const switchToArc = useCallback(async () => {
    if (!provider) return;
    const client = createClient(provider);
    const isCurrent = beginRequest('switch');
    setState((current) => ({ ...current, error: null, isSwitching: true }));
    // Not every wallet sends chainChanged, so read the network after each step.
    const readChain = async () => {
      const chainId = await client.getChainId();
      if (isCurrent()) setState((current) => ({ ...current, chainId }));
      return chainId;
    };
    try {
      await client.switchChain({ id: arcChain.id });
      await readChain();
    } catch (switchError) {
      if (!isCurrent()) return;
      if (!isUnknownChain(switchError)) {
        logger.warn('Switching to Arc failed', switchError);
        setState((current) => ({ ...current, error: toWalletError(switchError) }));
        return;
      }
      try {
        await client.addChain({ chain: arcChain });
        // Some wallets add the network without switching to it.
        if (!isArcChain(await readChain())) {
          await client.switchChain({ id: arcChain.id });
          await readChain();
        }
      } catch (addError) {
        if (!isCurrent()) return;
        logger.warn('Adding Arc failed', addError);
        setState((current) => ({ ...current, error: toWalletError(addError) }));
      }
    } finally {
      if (isCurrent()) setState((current) => ({ ...current, isSwitching: false }));
    }
  }, [provider, beginRequest]);

  /**
   * Stops waiting for the open connect or switch request. The wallet may still show it; if the
   * user approves it later, accountsChanged / chainChanged still update the page.
   */
  const cancelRequest = useCallback(() => {
    endRequest();
    setState((current) =>
      current.status === 'connecting' ? DISCONNECTED : { ...current, isSwitching: false },
    );
  }, [endRequest]);

  /**
   * Injected wallets have no standard disconnect (EIP-1193). Ask the wallet to revoke this site's
   * account access (wallet_revokePermissions, e.g. MetaMask) and always forget it in the app.
   */
  const disconnect = useCallback(async () => {
    endRequest();
    setStorageItem(StorageKey.WalletDisconnected, true);
    setState(DISCONNECTED);
    if (!provider) return;
    try {
      await createClient(provider).request({
        method: 'wallet_revokePermissions',
        params: [{ eth_accounts: {} }],
      });
    } catch (error) {
      // Not supported by every wallet; the app has already forgotten the connection.
      logger.debug('Wallet permission revoke not available', error);
    }
  }, [provider, endRequest]);

  const isOnArc = isArcChain(state.chainId);

  return { ...state, isOnArc, connect, disconnect, switchToArc, cancelRequest };
};

/** USDC balance of the connected wallet on Arc (6-decimal ERC-20). */
export const useUsdcBalance = (address: Address | null, isOnArc: boolean) =>
  useQuery(walletQueries.usdcBalance(address, isOnArc));
