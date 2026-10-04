import { useEffect, useMemo, useRef, useState } from 'react';
import type { PlayerHandle } from '../player/useYouTubePlayer';
import type { Segment } from '../types/api';

type PlayerSource = PlayerHandle | null | undefined | { current: PlayerHandle | null };

function resolve(source: PlayerSource): PlayerHandle | null {
  if (!source) return null;
  return 'current' in source ? source.current : source;
}

/**
 * Poll a player's position. Returns milliseconds, or null until the player
 * reports a time. State changes only when the position moves by `resolutionMs`.
 */
export function usePlaybackTime(
  player: PlayerSource,
  {
    intervalMs = 250,
    resolutionMs = 250,
    enabled = true,
  }: { intervalMs?: number; resolutionMs?: number; enabled?: boolean } = {}
) {
  const [currentMs, setCurrentMs] = useState<number | null>(null);
  const playerRef = useRef(player);
  playerRef.current = player;
  useEffect(() => {
    if (!enabled) return;
    const tick = () => {
      const seconds = resolve(playerRef.current)?.getCurrentTime();
      if (seconds == null || !Number.isFinite(seconds)) return;
      const next = Math.floor((seconds * 1000) / resolutionMs) * resolutionMs;
      setCurrentMs((previous) => (previous === next ? previous : next));
    };
    tick();
    const timer = setInterval(tick, intervalMs);
    return () => clearInterval(timer);
  }, [enabled, intervalMs, resolutionMs]);
  return currentMs;
}

/**
 * Index of the segment playing at `currentMs` (the last segment that started
 * at or before it), or -1. Segments must be sorted by `start_ms`.
 */
export function findSegmentIndexAt(segments: Pick<Segment, 'start_ms'>[], currentMs: number) {
  let low = 0;
  let high = segments.length - 1;
  let found = -1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (segments[middle].start_ms <= currentMs) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return found;
}

export function useActiveSegmentIndex(segments: Segment[], currentMs: number | null) {
  return useMemo(
    () => (currentMs == null ? -1 : findSegmentIndexAt(segments, currentMs)),
    [segments, currentMs]
  );
}
