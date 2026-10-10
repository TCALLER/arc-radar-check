import type { CheckOk } from './schema';

/** What the check side of the screen shows. */
export type CheckView =
  | { kind: 'idle' }
  | { kind: 'scanning' }
  /** `status: error` from the API: its message is untrusted text. */
  | { kind: 'apiError'; message: string }
  | { kind: 'timeout' }
  /** Network failure or a response that didn't match the schema. */
  | { kind: 'failed' }
  | { kind: 'payment'; priceUsdc: string }
  | { kind: 'result'; data: CheckOk };

/** Access to the full report, decided only by the server's /v1/access answer. */
export type AccessState =
  | 'locked'
  | 'connecting'
  | 'checking'
  | 'notHolder'
  | 'failed'
  | 'wrongNet'
  | 'noWallet'
  | 'holder';

export type ClaimTone = 'ok' | 'caution' | 'muted';
