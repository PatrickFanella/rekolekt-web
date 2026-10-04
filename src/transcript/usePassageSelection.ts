import { useMemo, useState } from 'react';
import type { PlayerHandle } from '../player/useYouTubePlayer';
import type { Segment } from '../types/api';
import { absoluteUrl } from '../format/links';
import { copyText } from '../clipboard/useCopy';
import {
  buildPassageLink,
  buildPassageShareLink,
  formatPassageTime,
  parsePassageTime,
  passageRangeError,
  type PassageRange,
} from './passages';

export type PassageFeedback =
  | 'playback-unavailable'
  | 'preview-requested'
  | 'continuing'
  | 'link-copied'
  | 'copy-unavailable'
  | 'shared'
  | 'share-cancelled'
  | 'share-unavailable';

export type PassageContext = {
  /** Selected segments plus one segment of context on each side. */
  entries: Array<{ segment: Segment; selected: boolean }>;
  /** Selected segments beyond `maxSegments` that are not listed. */
  omitted: number;
};

type PlayerSource = PlayerHandle | null | undefined | { current: PlayerHandle | null };
function resolve(source: PlayerSource) {
  if (!source) return null;
  return 'current' in source ? source.current : source;
}

/**
 * State and actions for choosing, previewing and sharing a passage of one
 * episode. Times are edited as text so readers can type them freely.
 */
export function usePassageSelection({
  videoId,
  title,
  initialRange,
  durationMs,
  segments,
  player,
  shareUrl = 'api',
  apiBase = '/api',
  episodeLink = buildPassageLink,
  maxSegments = 200,
}: {
  videoId: string;
  title: string;
  initialRange: PassageRange;
  durationMs?: number;
  segments: Segment[];
  player?: PlayerSource;
  /**
   * `api` shares Rekolekt's `/share/videos/:id` URL, which renders crawler
   * metadata (use when `site.public_passages_enabled`); `episode` shares the
   * frontend episode link.
   */
  shareUrl?: 'api' | 'episode';
  apiBase?: string;
  episodeLink?: (videoId: string, range: PassageRange) => string;
  maxSegments?: number;
}) {
  const [start, setStartText] = useState(
    Number.isFinite(initialRange.startMs) ? formatPassageTime(initialRange.startMs) : ''
  );
  const [end, setEndText] = useState(
    Number.isFinite(initialRange.endMs) ? formatPassageTime(initialRange.endMs) : ''
  );
  const [feedback, setFeedback] = useState<PassageFeedback | null>(null);
  const [busy, setBusy] = useState(false);
  const startMs = parsePassageTime(start);
  const endMs = parsePassageTime(end);
  const error = passageRangeError(startMs, endMs, durationMs);
  const range: PassageRange | null =
    !error && startMs !== null && endMs !== null ? { startMs, endMs } : null;
  const link = range
    ? absoluteUrl(
        shareUrl === 'api'
          ? buildPassageShareLink(videoId, range, apiBase)
          : episodeLink(videoId, range)
      )
    : '';

  const context = useMemo<PassageContext>(() => {
    if (startMs === null || endMs === null || error) return { entries: [], omitted: 0 };
    const first = segments.findIndex((s) => s.end_ms > startMs && s.start_ms < endMs);
    if (first < 0) return { entries: [], omitted: 0 };
    let last = first;
    while (last + 1 < segments.length && segments[last + 1].start_ms < endMs) last++;
    const selectedEnd = Math.min(last + 1, first + maxSegments);
    const entries = [
      ...segments.slice(Math.max(0, first - 1), selectedEnd),
      ...segments.slice(last + 1, last + 2),
    ].map((segment) => ({
      segment,
      selected: segment.end_ms > startMs && segment.start_ms < endMs,
    }));
    return { entries, omitted: last + 1 - selectedEnd };
  }, [startMs, endMs, segments, error, maxSegments]);

  function setTime(which: 'start' | 'end', value: string) {
    resolve(player)?.pause();
    setFeedback(null);
    (which === 'start' ? setStartText : setEndText)(value);
  }

  const previous = range ? [...segments].reverse().find((s) => s.start_ms < range.startMs) : null;
  const next = range
    ? segments.find((s) => s.end_ms > range.endMs && (!durationMs || s.end_ms <= durationMs))
    : null;

  return {
    start,
    end,
    setStart: (value: string) => setTime('start', value),
    setEnd: (value: string) => setTime('end', value),
    error,
    range,
    link,
    context,
    feedback,
    busy,
    durationSeconds: range ? (range.endMs - range.startMs) / 1000 : null,
    canIncludePrevious: Boolean(previous),
    canIncludeNext: Boolean(next),
    canShare: typeof navigator !== 'undefined' && typeof navigator.share === 'function',
    includePrevious() {
      if (previous) setTime('start', formatPassageTime(previous.start_ms));
    },
    includeNext() {
      if (next) setTime('end', formatPassageTime(next.end_ms));
    },
    setFromPlayback(which: 'start' | 'end') {
      const seconds = resolve(player)?.getCurrentTime();
      if (seconds == null || !Number.isFinite(seconds) || seconds < 0) {
        setFeedback('playback-unavailable');
        return;
      }
      setTime(which, formatPassageTime(Math.round(seconds * 1000)));
    },
    preview() {
      if (!range) return;
      resolve(player)?.previewRange(range.startMs / 1000, range.endMs / 1000);
      setFeedback('preview-requested');
    },
    continueAfter() {
      if (!range) return;
      resolve(player)?.seekTo(range.endMs / 1000, { play: true });
      setFeedback('continuing');
    },
    async copyLink() {
      if (!range) return;
      try {
        await copyText(link);
        setFeedback('link-copied');
      } catch {
        setFeedback('copy-unavailable');
      }
    },
    async share() {
      if (!range) return;
      setBusy(true);
      try {
        await navigator.share({
          title: `${title} · ${formatPassageTime(range.startMs)}–${formatPassageTime(range.endMs)}`,
          url: link,
        });
        setFeedback('shared');
      } catch (cause) {
        setFeedback(
          cause instanceof Error && cause.name === 'AbortError'
            ? 'share-cancelled'
            : 'share-unavailable'
        );
      } finally {
        setBusy(false);
      }
    },
    /** Stop playback, e.g. before closing the editor. */
    pause() {
      resolve(player)?.pause();
    },
  };
}
