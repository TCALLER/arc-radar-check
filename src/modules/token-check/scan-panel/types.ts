import type { AccessControls } from '../access-panel';
import type { CheckView } from '../types';

export type PreResultView = Exclude<CheckView, { kind: 'result' }>;

export type ScanPanelProps = {
  view: PreResultView;
  onRetry: () => void;
  onTryAnother: () => void;
  /** Wallet + holder check, shown inside the 402 message once the user starts connecting. */
  access: AccessControls;
};
