import { episodeLink } from '../format/links';

export type PassageRange = { startMs: number; endMs: number };

/** Why a passage range is unusable; components map these to strings. */
export type PassageRangeError = 'invalid' | 'order' | 'beyond-recording';

/** Parse `hh:mm:ss(.mmm)`, `mm:ss` or plain seconds into milliseconds. */
export function parsePassageTime(value: string): number | null {
  if (!/^\d+(?::[0-5]\d){0,2}(?:\.\d{1,3})?$/.test(value.trim())) return null;
  const parts = value.trim().split(':').map(Number);
  const ms = Math.round(parts.reduce((seconds, part) => seconds * 60 + part, 0) * 1000);
  return Number.isSafeInteger(ms) ? ms : null;
}

export function formatPassageTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const fraction = ms % 1000 ? `.${String(ms % 1000).padStart(3, '0')}` : '';
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}${fraction}`;
}

export function passageRangeError(
  startMs: number | null,
  endMs: number | null,
  durationMs?: number
): PassageRangeError | null {
  if (
    startMs === null ||
    endMs === null ||
    !Number.isSafeInteger(startMs) ||
    !Number.isSafeInteger(endMs) ||
    startMs < 0 ||
    endMs < 0
  )
    return 'invalid';
  if (endMs <= startMs) return 'order';
  if (durationMs != null && durationMs > 0 && endMs > durationMs) return 'beyond-recording';
  return null;
}

/** Frontend link to a passage using the default `/v/:id` route. */
export function buildPassageLink(videoId: string, range: PassageRange) {
  return episodeLink(videoId, { startMs: range.startMs, endMs: range.endMs });
}

/**
 * Read a passage from episode URL parameters (`t` or `t_ms`, and `end_ms`).
 * Malformed values become NaN rather than silently sharing a different range.
 */
export function readPassageRange(params: URLSearchParams): PassageRange | null {
  const end = params.get('end_ms');
  const start = params.get('t_ms') ?? params.get('t');
  if (end === null) return null;
  const startMs =
    start !== null && /^\d+(?:\.\d{1,3})?$/.test(start)
      ? Number(start) * (params.has('t_ms') ? 1 : 1000)
      : NaN;
  const endMs = /^\d+$/.test(end) ? Number(end) : NaN;
  return { startMs, endMs };
}

/**
 * API share URL for a passage. Rekolekt serves crawler metadata there and
 * redirects people to the episode route. `apiBase` is the API mount point.
 */
export function buildPassageShareLink(videoId: string, range: PassageRange, apiBase = '/api') {
  const params = new URLSearchParams({
    start_ms: String(range.startMs),
    end_ms: String(range.endMs),
  });
  return `${apiBase.replace(/\/+$/, '')}/share/videos/${encodeURIComponent(videoId)}?${params}`;
}
