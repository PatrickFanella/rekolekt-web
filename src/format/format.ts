const DATE_TIME_FORMAT = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
});

const MONTH_FORMAT = new Intl.DateTimeFormat(undefined, {
  month: 'long',
});

export function formatDuration(seconds?: number | null) {
  if (seconds == null || Number.isNaN(seconds)) return '—';
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainingSeconds = total % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
    : `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

export function formatShortDuration(seconds?: number | null) {
  if (seconds == null || Number.isNaN(seconds)) return '—';
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.round((total % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  return `${minutes}m`;
}

export function formatAggregateDuration(seconds?: number | null) {
  if (seconds == null || Number.isNaN(seconds)) return '—';
  const hours = Math.max(0, seconds) / 3600;
  if (hours >= 1000)
    return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(hours / 1000)}k hours`;
  if (hours >= 100) return `${Math.round(hours).toLocaleString()} hours`;
  return formatShortDuration(seconds);
}

export function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return DATE_FORMAT.format(date);
}

/**
 * A readable episode title. Strips trailing dashes and labels date-only titles.
 * Pass `labels` to change the wording used for date-only or missing titles.
 */
export function formatVideoTitle(
  title?: string | null,
  uploadedAt?: string | null,
  labels: {
    dated?: (date: string) => string;
    fromDate?: (date: string) => string;
    untitled?: string;
  } = {}
) {
  const {
    dated = (date) => `Broadcast — ${date}`,
    fromDate = (date) => `Broadcast from ${date}`,
    untitled = 'Broadcast recording',
  } = labels;
  const cleaned = title?.replace(/\s*[-–—]\s*$/, '').trim();
  if (cleaned) {
    const dateOnly = cleaned.match(
      /^((?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},\s+\d{4})$/i
    );
    return dateOnly ? dated(dateOnly[1]) : cleaned;
  }
  const date = formatDate(uploadedAt);
  return date === '—' ? untitled : fromDate(date);
}
export function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return DATE_TIME_FORMAT.format(date);
}

export function formatTimestamp(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600)
    .toString()
    .padStart(2, '0');
  const minutes = Math.floor((total % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (total % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export function formatMonthLabel(year: number, month: number) {
  return `${MONTH_FORMAT.format(new Date(year, Math.max(0, month - 1), 1))} ${year}`;
}

export function formatNumber(value?: number | null) {
  if (value == null || Number.isNaN(value)) return '0';
  return new Intl.NumberFormat(undefined).format(value);
}

export function buildMonthRange(year: number, month: number) {
  const start = new Date(Date.UTC(year, Math.max(0, month - 1), 1));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return {
    date_from: start.toISOString().slice(0, 10),
    date_to: end.toISOString().slice(0, 10),
  };
}

export type TranscriptSource = 'whisper' | 'youtube' | 'merged';

export function titleCase(value: string) {
  return value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
