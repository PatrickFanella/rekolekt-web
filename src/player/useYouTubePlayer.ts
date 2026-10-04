import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadYouTubeApi } from './youtubeApi';

type YouTubeApiPlayer = {
  destroy?: () => void;
  loadVideoById?: (options: { videoId: string; startSeconds: number; endSeconds?: number }) => void;
  seekTo?: (seconds: number, allowSeekAhead: boolean) => void;
  playVideo?: () => void;
  pauseVideo?: () => void;
  getPlayerState?: () => number;
  getCurrentTime?: () => number;
};

type YouTubePlayerConstructor = {
  new (
    element: HTMLElement,
    config: {
      height: string;
      width: string;
      videoId: string;
      playerVars: { start: number; autoplay: number };
      events: {
        onReady: () => void;
        onError: (event: { data?: number }) => void;
        onStateChange?: (event: { data?: number }) => void;
      };
    }
  ): YouTubeApiPlayer;
};

declare global {
  interface Window {
    YT?: {
      Player?: YouTubePlayerConstructor;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

/** Imperative controls shared by the player, transcript sync and passage editor. */
export type PlayerHandle = {
  seekTo: (seconds: number, options?: { play?: boolean }) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  /** Current position in seconds, or null before the player is ready. */
  getCurrentTime: () => number | null;
  /** Play only `[startSeconds, endSeconds)` and stop. */
  previewRange: (startSeconds: number, endSeconds: number) => void;
};

export type PlayerStatus = 'loading' | 'ready' | 'error';
export type PlayerError = { kind: 'script' | 'player'; code?: number; message: string };

const PLAYING = 1;

/**
 * Mount a YouTube IFrame player into `containerRef` and expose controls that
 * queue seeks until the player is ready. Rendering is up to the caller.
 */
export function useYouTubePlayer({ videoId, start = 0 }: { videoId: string; start?: number }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YouTubeApiPlayer | null>(null);
  const startRef = useRef(start);
  const previousStartRef = useRef(start);
  startRef.current = start;
  const pendingSeekRef = useRef<{ seconds: number; play: boolean } | null>(null);
  const pendingRangeRef = useRef<{ startSeconds: number; endSeconds: number } | null>(null);
  const [status, setStatus] = useState<PlayerStatus>('loading');
  const [error, setError] = useState<PlayerError | null>(null);
  const [playing, setPlaying] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const ready = status === 'ready';

  const seek = useCallback(
    (seconds: number, play = false) => {
      pendingRangeRef.current = null;
      pendingSeekRef.current = { seconds, play };
      if (!ready || !playerRef.current) return;
      try {
        playerRef.current.seekTo?.(seconds, true);
        const isPlaying = playerRef.current.getPlayerState?.() === PLAYING;
        if (play && !isPlaying) playerRef.current.playVideo?.();
        pendingSeekRef.current = null;
      } catch {
        // Keep the pending seek for the next ready transition.
      }
    },
    [ready]
  );

  useEffect(() => {
    let active = true;
    setStatus('loading');
    setError(null);
    setPlaying(false);
    pendingRangeRef.current = null;
    const initialStart = startRef.current;
    pendingSeekRef.current = initialStart ? { seconds: initialStart, play: false } : null;
    void loadYouTubeApi()
      .then(() => {
        if (!active || !containerRef.current || !window.YT?.Player) return;
        playerRef.current = new window.YT.Player(containerRef.current, {
          height: '100%',
          width: '100%',
          videoId,
          playerVars: { start: initialStart, autoplay: 0 },
          events: {
            onReady: () => {
              if (active) setStatus('ready');
            },
            onError: (event) => {
              if (!active) return;
              setError({ kind: 'player', code: event.data, message: 'YouTube player error' });
              setStatus('error');
            },
            onStateChange: (event) => {
              if (active) setPlaying(event.data === PLAYING);
            },
          },
        });
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError({
          kind: 'script',
          message: cause instanceof Error ? cause.message : 'Player unavailable',
        });
        setStatus('error');
      });
    return () => {
      active = false;
      try {
        playerRef.current?.destroy?.();
      } catch {
        // Ignore teardown errors from the third-party player.
      }
      playerRef.current = null;
    };
  }, [attempt, videoId]);

  useEffect(() => {
    const changed = previousStartRef.current !== start;
    previousStartRef.current = start;
    if (start || changed) pendingSeekRef.current = { seconds: start, play: false };
    if (ready && pendingRangeRef.current) {
      playerRef.current?.loadVideoById?.({ videoId, ...pendingRangeRef.current });
      pendingRangeRef.current = null;
      pendingSeekRef.current = null;
    } else if (ready && pendingSeekRef.current) {
      const pendingSeek = pendingSeekRef.current;
      seek(pendingSeek.seconds, pendingSeek.play);
    }
  }, [ready, seek, start, videoId]);

  const controls = useMemo<PlayerHandle>(
    () => ({
      previewRange(startSeconds, endSeconds) {
        if (
          !Number.isFinite(startSeconds) ||
          !Number.isFinite(endSeconds) ||
          startSeconds < 0 ||
          endSeconds <= startSeconds
        )
          return;
        pendingSeekRef.current = null;
        pendingRangeRef.current = { startSeconds, endSeconds };
        if (ready && playerRef.current?.loadVideoById) {
          playerRef.current.loadVideoById({ videoId, startSeconds, endSeconds });
          pendingRangeRef.current = null;
        }
      },
      seekTo(seconds, options) {
        seek(seconds, options?.play ?? false);
      },
      play() {
        try {
          playerRef.current?.playVideo?.();
        } catch {
          // Player API errors are not actionable for the reader.
        }
      },
      pause() {
        pendingRangeRef.current = null;
        if (pendingSeekRef.current) pendingSeekRef.current.play = false;
        try {
          playerRef.current?.pauseVideo?.();
        } catch {
          // Player API errors are not actionable for the reader.
        }
      },
      togglePlay() {
        try {
          if (playerRef.current?.getPlayerState?.() === PLAYING) playerRef.current.pauseVideo?.();
          else playerRef.current?.playVideo?.();
        } catch {
          // Player API errors are not actionable for the reader.
        }
      },
      getCurrentTime() {
        try {
          return playerRef.current?.getCurrentTime?.() ?? null;
        } catch {
          return null;
        }
      },
    }),
    [ready, seek, videoId]
  );

  return {
    containerRef,
    status,
    error,
    playing,
    controls,
    retry: () => setAttempt((value) => value + 1),
    /** Link to the recording on YouTube at the current start position. */
    sourceUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&t=${Math.max(0, Math.floor(start))}s`,
  };
}
