import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { env } from '@/common/config/env';
import { useAuth } from '@/common/context/identity';
import { useIsTouchDevice } from '@/common/hooks/use-is-touch-device';
import { useTelegramTheme } from '@/common/hooks/use-telegram-theme';
import { hapticError, hapticTap, openTelegramLink } from '@/common/utils/global-utility';
import { logger } from '@/common/utils/logger';

import { useUsdcBalance, useWallet, type WalletError } from '@/modules/wallet';

import { DEV_STATE_PARAM, MIN_SCAN_MS, TOKEN_PARAM } from '../constants';
import { getDevScenario } from '../dev-scenarios';
import {
  readLinkedToken,
  toAccessState,
  toAnnouncement,
  toCheckView,
  toShareUrl,
  toTimelineIndex,
  toDataBadge,
} from '../functions';
import { useHolderAccess, useTokenCheck } from '../hooks';

import { useMinimumScan } from './use-minimum-scan';

import type { AccessControls, NoWalletPlatform } from '../access-panel';
import type { BalanceState, WalletSummary } from '../wallet-row';

const isMocking = env.NEXT_PUBLIC_API_MOCKING === 'enabled';
const COPIED_RESET_MS = 1600;
// A failed check: the API's error, a timeout, or a network/shape failure.
const FAILED_CHECK_KINDS = new Set(['apiError', 'timeout', 'failed']);

const WALLET_MESSAGES: Record<NonNullable<WalletError>, string> = {
  rejected: 'You cancelled the request in your wallet.',
  pending: 'Your wallet has an earlier request open. Answer it there, or reload this page.',
  failed: "Couldn't reach your wallet. Try again.",
};

/** Composes the check, the wallet, the server's access answer and page-level handlers. */
export const useTokenCheckPage = () => {
  const searchParams = useSearchParams();
  const scenario = getDevScenario(searchParams.get(DEV_STATE_PARAM), isMocking);
  const { isTelegram } = useTelegramTheme();
  const isTouchDevice = useIsTouchDevice();
  const { user } = useAuth();

  // A shared link (?token=0x…) opens with that check already running.
  const linkedToken = readLinkedToken(searchParams.get(TOKEN_PARAM));
  const startAddress = scenario.address ?? linkedToken;

  const [submittedAddress, setSubmittedAddress] = useState<string | null>(startAddress);
  const [formKey, setFormKey] = useState(0);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  // Set when the browser won't let us copy: the link is then shown to copy by hand.
  const [manualCopyUrl, setManualCopyUrl] = useState<string | null>(null);

  const checkQuery = useTokenCheck(submittedAddress);
  const minimumScan = useMinimumScan(MIN_SCAN_MS);
  const checkView =
    scenario.forceScanning || (minimumScan.isHolding && submittedAddress)
      ? ({ kind: 'scanning' } as const)
      : toCheckView(submittedAddress, checkQuery);

  const wallet = useWallet();
  const balanceQuery = useUsdcBalance(wallet.address, wallet.isOnArc);
  // Keyed by address: an account change re-checks and drops the previous answer.
  const accessQuery = useHolderAccess(wallet.address);

  const accessState = scenario.access ?? toAccessState(wallet, accessQuery);
  /**
   * The single unlock state: only the server's `holder: true` opens the report.
   * TODO(x402): also unlock when the client's payment flow reports a completed payment.
   */
  const isUnlocked = accessState === 'holder';

  const balanceState: BalanceState = !wallet.isOnArc
    ? 'offArc'
    : balanceQuery.isError
      ? 'error'
      : balanceQuery.data === undefined
        ? 'loading'
        : 'ready';
  const walletSummary: WalletSummary | null = wallet.address
    ? {
        address: wallet.address,
        isOnArc: wallet.isOnArc,
        balance: balanceQuery.data ?? null,
        balanceState,
      }
    : null;
  const noWalletPlatform: NoWalletPlatform = isTelegram
    ? 'telegram'
    : isTouchDevice
      ? 'mobile'
      : 'desktop';
  const walletMessage = wallet.error ? WALLET_MESSAGES[wallet.error] : null;

  const dataBadge = toDataBadge(isMocking, checkQuery.data?.sample ?? false);

  const isCheckFailed = FAILED_CHECK_KINDS.has(checkView.kind);
  useEffect(() => {
    if (isCheckFailed) hapticError();
  }, [isCheckFailed]);

  useEffect(() => {
    if (!isLinkCopied) return;
    const timer = setTimeout(() => setIsLinkCopied(false), COPIED_RESET_MS);
    return () => clearTimeout(timer);
  }, [isLinkCopied]);

  const handleSubmit = (address: string) => {
    hapticTap();
    minimumScan.startHold();
    if (address.toLowerCase() === submittedAddress?.toLowerCase()) {
      void checkQuery.refetch();
      return;
    }
    setSubmittedAddress(address);
  };

  const handleRetry = () => {
    minimumScan.startHold();
    void checkQuery.refetch();
  };

  const handleTryAnother = () => {
    setSubmittedAddress(null);
    setFormKey((key) => key + 1);
  };

  const handleConnect = () => {
    hapticTap();
    void wallet.connect();
  };
  const handleDisconnect = () => void wallet.disconnect();
  const handleSwitchNetwork = () => void wallet.switchToArc();
  const handleRetryAccess = () => void accessQuery.refetch();

  const handleCopyLink = () => {
    const shareUrl = toShareUrl(window.location.href, submittedAddress);
    const showManualCopy = () => setManualCopyUrl(shareUrl);
    if (!navigator.clipboard?.writeText) {
      showManualCopy();
      return;
    }
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        hapticTap();
        setManualCopyUrl(null);
        setIsLinkCopied(true);
      })
      .catch((error: unknown) => {
        // Clipboard blocked (permissions, in-app browsers): show the link to copy by hand.
        logger.warn('Copy link failed', error);
        showManualCopy();
      });
  };

  const handleOpenInBrowser = () =>
    openTelegramLink(toShareUrl(window.location.href, submittedAddress));

  const accessControls: AccessControls = {
    state: accessState,
    wallet: walletSummary,
    noWalletPlatform,
    isLinkCopied,
    manualCopyUrl,
    walletMessage,
    isSwitchingNetwork: wallet.isSwitching,
    isWalletSlow: wallet.isSlow,
    onConnect: handleConnect,
    onCancelWalletRequest: wallet.cancelRequest,
    onDisconnect: handleDisconnect,
    onRetryAccess: handleRetryAccess,
    onSwitchNetwork: handleSwitchNetwork,
    onCopyLink: handleCopyLink,
    onOpenInBrowser: handleOpenInBrowser,
  };

  return {
    checkView,
    accessControls,
    lockedPriceUsdc: env.NEXT_PUBLIC_CHECK_PRICE_USDC ?? null,
    isUnlocked,
    announcement: toAnnouncement(checkView),
    timelineIndex:
      checkView.kind === 'result' ? toTimelineIndex(checkView.data.risk_flags.length) : 0,
    dataBadge,
    isTelegram,
    // Display only, and only inside Telegram: the name is never used for access.
    telegramName: isTelegram ? (user?.displayName ?? null) : null,
    submittedAddress,
    formKey,
    initialInput: formKey === 0 ? (scenario.initialInput ?? startAddress ?? '') : '',
    handleSubmit,
    handleRetry,
    handleTryAnother,
  };
};
