import { MOCK_ADDRESSES } from './mocks-addresses';

import type { AccessState } from './types';

/**
 * Dev state switch: `?state=<id>` with the shared state ids. Active only when
 * NEXT_PUBLIC_API_MOCKING=enabled. Data always comes from the unchanged samples via MSW; only the
 * wallet/holder step can be forced, because the wallet isn't mocked.
 * `unknown` and `empty` have no sample (and the samples are served unchanged, with no extra fixtures), so they are covered by
 * component tests instead.
 */
export type DevScenario = {
  address?: string;
  initialInput?: string;
  forceScanning?: boolean;
  access?: AccessState;
};

export const DEV_SCENARIOS: Record<string, DevScenario> = {
  idle: {},
  invalid: { initialInput: '0x12ab' },
  scanning: { address: MOCK_ADDRESSES.ok, forceScanning: true },
  error: { address: '0x2222222222222222222222222222222222222222' },
  timeout: { address: MOCK_ADDRESSES.timeout },
  payment402: { address: MOCK_ADDRESSES.paymentRequired },
  locked: { address: MOCK_ADDRESSES.ok },
  connecting: { address: MOCK_ADDRESSES.ok, access: 'connecting' },
  checking: { address: MOCK_ADDRESSES.ok, access: 'checking' },
  notHolder: { address: MOCK_ADDRESSES.ok, access: 'notHolder' },
  failed: { address: MOCK_ADDRESSES.ok, access: 'failed' },
  wrongNet: { address: MOCK_ADDRESSES.ok, access: 'wrongNet' },
  noWallet: { address: MOCK_ADDRESSES.ok, access: 'noWallet' },
  holder: { address: MOCK_ADDRESSES.ok, access: 'holder' },
  hostile: { address: MOCK_ADDRESSES.hostile, access: 'holder' },
};

export const getDevScenario = (stateId: string | null, isMocking: boolean): DevScenario => {
  if (!isMocking || !stateId) return {};
  return Object.hasOwn(DEV_SCENARIOS, stateId) ? (DEV_SCENARIOS[stateId] ?? {}) : {};
};
