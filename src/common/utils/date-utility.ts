import { format, isValid, parseISO } from 'date-fns';
import { enGB } from 'date-fns/locale';

export const DATE_FORMAT = 'd MMM yyyy';
export const DATE_TIME_FORMAT = 'd MMM yyyy, HH:mm';
const EMPTY_DATE_FALLBACK = '—';
const DEFAULT_LOCALE = enGB;

const toValidDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const date = parseISO(value);
  return isValid(date) ? date : null;
};

/** Formats an ISO date string; invalid or missing values return a dash, never "Invalid Date". */
export const formatDate = (value?: string | null, pattern = DATE_FORMAT): string => {
  const date = toValidDate(value);
  return date ? format(date, pattern, { locale: DEFAULT_LOCALE }) : EMPTY_DATE_FALLBACK;
};

export const formatDateTime = (value?: string | null): string =>
  formatDate(value, DATE_TIME_FORMAT);
