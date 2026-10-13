import { Severity, VerdictLevel } from './schema';

import type { BadgeTone } from '@/common/components/components/badge';

export const CHECK_ENDPOINT = '/v1/check';
export const ACCESS_ENDPOINT = '/v1/access';

/** Page URL parameters: the token to check on load, and the dev state switch. */
export const TOKEN_PARAM = 'token';
export const DEV_STATE_PARAM = 'state';

export const VERDICT_LABELS: Record<VerdictLevel, string> = {
  [VerdictLevel.Ok]: 'Looks OK',
  [VerdictLevel.Caution]: 'Be careful',
  [VerdictLevel.Danger]: 'High risk',
  [VerdictLevel.Unknown]: 'Not enough data',
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  [Severity.High]: 'High risk',
  [Severity.Medium]: 'Medium risk',
  [Severity.Low]: 'Low risk',
  [Severity.Info]: 'Info',
};

export const SEVERITY_BADGE_TONES: Record<Severity, BadgeTone> = {
  [Severity.High]: 'danger',
  [Severity.Medium]: 'caution',
  [Severity.Low]: 'neutral',
  [Severity.Info]: 'neutral',
};

/** The 8 locked sections, listed by name only in the locked panel. */
export const LOCKED_SECTION_NAMES = [
  'Safety score',
  'In plain words',
  'Warning signs',
  'Who holds it',
  'Burns',
  'Buybacks',
  'Token details',
  'Sources',
] as const;

export const SCAN_TOPICS = ['Warning signs', 'Who holds it', 'Burns and buybacks'] as const;

/** The radar sweeps at least this long, so a fast answer never flickers. */
export const MIN_SCAN_MS = 600;

/*
 * Result timeline: blips start at +120 ms, one every 170 ms (max 8). The verdict settles
 * 200 ms after the last blip starts (450 ms with no flags); the report sheet rises 150 ms after
 * the verdict. Indexed by the drawn blip count. Literal classes so Tailwind sees them.
 */
export const VERDICT_SETTLE_DELAY_CLASSES = [
  '[animation-delay:450ms]',
  '[animation-delay:320ms]',
  '[animation-delay:490ms]',
  '[animation-delay:660ms]',
  '[animation-delay:830ms]',
  '[animation-delay:1000ms]',
  '[animation-delay:1170ms]',
  '[animation-delay:1340ms]',
  '[animation-delay:1510ms]',
] as const;

export const SHEET_RISE_DELAY_CLASSES = [
  '[animation-delay:600ms]',
  '[animation-delay:470ms]',
  '[animation-delay:640ms]',
  '[animation-delay:810ms]',
  '[animation-delay:980ms]',
  '[animation-delay:1150ms]',
  '[animation-delay:1320ms]',
  '[animation-delay:1490ms]',
  '[animation-delay:1660ms]',
] as const;

export const UNLABELLED = 'Unlabelled';
export const SOURCE_FALLBACK_LABEL = 'Untitled source';
