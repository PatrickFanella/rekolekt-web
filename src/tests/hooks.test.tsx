import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { RekolektProvider, createQueryClient } from '../provider/RekolektProvider';
import { useArchiveSearch, mergeSearchPages } from '../search/useArchiveSearch';
import { useEpisodes, useTranscript } from '../episodes/hooks';
import { useFavorites } from '../favorites/useFavorites';
import { useSavedSearches } from '../saved-searches/useSavedSearches';
import { localFavorites } from '../favorites/localFavorites';
import { localSavedSearches } from '../saved-searches/localSavedSearches';
import { findSegmentIndexAt, usePlaybackTime } from '../transcript/usePlaybackSync';
import { usePassageSelection } from '../transcript/usePassageSelection';
import { useCopy } from '../clipboard/useCopy';
import { useMomentActions } from '../transcript/useMomentActions';
import type { PlayerHandle } from '../player/useYouTubePlayer';
import { createTestClient, type MockRoute } from './test-utils';

const video = (id: string) => ({ id, youtube_id: `yt-${id}`, title: `Episode ${id}` });
const moment = (id: number, videoId: string, start: number) => ({
  id,
  video_id: videoId,
  start_ms: start,
  end_ms: start + 1000,
  snippet: `moment ${id}`,
});

function setup(routes: Record<string, MockRoute> = {}, providerProps = {}) {
  const test = createTestClient(routes);
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({ queries: { retry: false } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <RekolektProvider client={test.client} queryClient={queryClient} {...providerProps}>
      {children}
    </RekolektProvider>
  );
  return { ...test, wrapper };
}

describe('useArchiveSearch', () => {
  it('does not request blank queries', () => {
    const { wrapper, calls } = setup();
    const { result } = renderHook(() => useArchiveSearch({ q: '   ' }), { wrapper });
    expect(result.current.enabled).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(calls.filter((call) => call.path.startsWith('/search'))).toHaveLength(0);
  });

  it('loads pages and merges moments into existing episode groups', async () => {
    const track = vi.fn();
    const { wrapper, calls } = setup(
      {
        '/search/grouped': (_request: Request, url: URL) =>
          url.searchParams.get('offset') === '0'
            ? {
                total_moments: 1,
                total_videos: 1,
                groups: [{ video: video('a'), moments: [moment(1, 'a', 0)] }],
                page_info: {
                  has_next_page: true,
                  next_offset: 20,
                  limit: 20,
                  offset: 0,
                  has_previous_page: false,
                },
              }
            : {
                total_moments: 2,
                total_videos: 2,
                groups: [
                  { video: video('a'), moments: [moment(2, 'a', 5000)] },
                  { video: video('b'), moments: [moment(3, 'b', 0)] },
                ],
                page_info: { has_next_page: false, limit: 20, offset: 20, has_previous_page: true },
              },
      },
      { analytics: { track, flush: vi.fn(), dispose: vi.fn() } }
    );
    const { result } = renderHook(() => useArchiveSearch({ q: 'rent', match_mode: 'whole_word' }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.results?.total_moments).toBe(1));
    expect(result.current.canLoadMore).toBe(true);
    expect(
      calls.find((call) => call.path === '/search/grouped')?.url.searchParams.get('match_mode')
    ).toBe('whole_word');
    expect(track).toHaveBeenCalledWith(expect.objectContaining({ type: 'search' }));
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.results?.total_moments).toBe(3));
    expect(result.current.results?.groups.map((group) => group.moments.length)).toEqual([2, 1]);
    expect(result.current.canLoadMore).toBe(false);
  });

  it('reports errors and can retry', async () => {
    const { wrapper } = setup({ '/search/grouped': new Response('{}', { status: 500 }) });
    const { result } = renderHook(() => useArchiveSearch({ q: 'x' }), { wrapper });
    await waitFor(() => expect(result.current.error).toBeTruthy());
  });

  it('returns null for no pages', () => {
    expect(mergeSearchPages([])).toBeNull();
  });
});

describe('useEpisodes', () => {
  it('follows the API cursor', async () => {
    const { wrapper, calls } = setup({
      '/videos': (_request: Request, url: URL) =>
        url.searchParams.get('cursor') === 'next'
          ? { items: [video('c')], page_info: { has_next_page: false, has_previous_page: true } }
          : {
              items: [video('a'), video('b')],
              page_info: {
                has_next_page: true,
                has_previous_page: false,
                next_cursor: 'next',
                total_count: 3,
              },
            },
    });
    const { result } = renderHook(() => useEpisodes({ limit: 2 }), { wrapper });
    await waitFor(() => expect(result.current.episodes).toHaveLength(2));
    expect(result.current.totalCount).toBe(3);
    act(() => result.current.loadMore());
    await waitFor(() =>
      expect(result.current.episodes.map((episode) => episode.id)).toEqual(['a', 'b', 'c'])
    );
    expect(
      calls
        .filter((call) => call.path === '/videos')
        .at(-1)
        ?.url.searchParams.get('offset')
    ).toBeNull();
  });

  it('falls back to offsets without a cursor', async () => {
    const { wrapper, calls } = setup({
      '/videos': (_request: Request, url: URL) => ({
        items: url.searchParams.get('offset') === '0' ? [video('a')] : [video('b')],
        page_info: {
          has_next_page: url.searchParams.get('offset') === '0',
          has_previous_page: false,
        },
      }),
    });
    const { result } = renderHook(() => useEpisodes({ limit: 1 }), { wrapper });
    await waitFor(() => expect(result.current.canLoadMore).toBe(true));
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.episodes).toHaveLength(2));
    expect(
      calls
        .filter((call) => call.path === '/videos')
        .at(-1)
        ?.url.searchParams.get('offset')
    ).toBe('1');
  });
});

describe('useTranscript', () => {
  it('stays idle without a video id', () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useTranscript(null), { wrapper });
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
  });
});

describe('useFavorites', () => {
  beforeEach(() => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    localFavorites.reload();
  });

  it('keeps signed-out favorites in local storage and toggles them', async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useFavorites('v1'), { wrapper });
    expect(result.current.storage).toBe('local');
    const input = { videoId: 'v1', startMs: 1000, endMs: 2000, text: 'hello', segIndex: 3 };
    await act(async () => expect(await result.current.toggle(input)).toBe('saved'));
    expect(result.current.isSaved(input)).toBe(true);
    expect(result.current.items).toEqual([
      expect.objectContaining({ text: 'hello', storage: 'local' }),
    ]);
    await act(async () => expect(await result.current.toggle(input)).toBe('removed'));
    expect(result.current.items).toHaveLength(0);
  });

  it('uses the API for signed-in readers', async () => {
    const { wrapper, calls } = setup({
      '/auth/me': { user: { id: 'u1', email: 'a@b.c' } },
      '/auth/csrf': { csrf_token: 'csrf' },
      '/users/me/favorites': { items: [] },
      'POST /users/me/favorites': { id: 'fav-1' },
      'DELETE /users/me/favorites/fav-1': { ok: true },
    });
    const { result } = renderHook(() => useFavorites('v1'), { wrapper });
    await waitFor(() => expect(result.current.storage).toBe('server'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const input = { videoId: 'v1', startMs: 1000, endMs: 2000, text: 'hello' };
    await act(async () => void (await result.current.toggle(input)));
    await waitFor(() => expect(result.current.items[0]?.id).toBe('fav-1'));
    const post = calls.find((call) => call.method === 'POST');
    expect(post?.request.headers.get('X-CSRF-Token')).toBe('csrf');
    await act(async () => void (await result.current.toggle(input)));
    await waitFor(() => expect(result.current.items).toHaveLength(0));
    expect(
      calls.some((call) => call.method === 'DELETE' && call.path === '/users/me/favorites/fav-1')
    ).toBe(true);
  });
});

describe('useSavedSearches', () => {
  beforeEach(() => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    localSavedSearches.reload();
  });

  it('saves locally once per query and filters, then removes', async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useSavedSearches(), { wrapper });
    await act(async () => void (await result.current.save('rent', { date_from: '2026-01-01' })));
    await act(async () => void (await result.current.save('rent', { date_from: '2026-01-01' })));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.isSaved('rent', { date_from: '2026-01-01' })).toBe(true);
    await act(async () => void (await result.current.remove(result.current.items[0].id)));
    expect(result.current.items).toHaveLength(0);
  });
});

describe('playback sync', () => {
  const segments = [
    { start_ms: 0, end_ms: 900, text: 'a' },
    { start_ms: 1000, end_ms: 1900, text: 'b' },
    { start_ms: 2000, end_ms: 2900, text: 'c' },
  ];

  it('finds the segment playing at a time', () => {
    expect(findSegmentIndexAt(segments, -1)).toBe(-1);
    expect(findSegmentIndexAt(segments, 0)).toBe(0);
    expect(findSegmentIndexAt(segments, 1500)).toBe(1);
    expect(findSegmentIndexAt(segments, 99_000)).toBe(2);
    expect(findSegmentIndexAt([], 10)).toBe(-1);
  });

  it('polls the player position', () => {
    vi.useFakeTimers();
    let seconds = 1.2;
    const player = { getCurrentTime: () => seconds } as PlayerHandle;
    const { result } = renderHook(() =>
      usePlaybackTime(player, { intervalMs: 100, resolutionMs: 500 })
    );
    expect(result.current).toBe(1000);
    seconds = 2.6;
    act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBe(2500);
    vi.useRealTimers();
  });
});

describe('usePassageSelection', () => {
  const segments = [
    { start_ms: 0, end_ms: 4000, text: 'zero' },
    { start_ms: 5000, end_ms: 9000, text: 'one' },
    { start_ms: 10000, end_ms: 14000, text: 'two' },
  ];

  function player(seconds: number | null = 7.5) {
    return {
      getCurrentTime: vi.fn(() => seconds),
      pause: vi.fn(),
      play: vi.fn(),
      togglePlay: vi.fn(),
      seekTo: vi.fn(),
      previewRange: vi.fn(),
    } satisfies PlayerHandle;
  }

  it('validates the range and builds share links and context', () => {
    const controls = player();
    const { result } = renderHook(() =>
      usePassageSelection({
        videoId: 'v1',
        title: 'Episode',
        initialRange: { startMs: 5000, endMs: 9000 },
        segments,
        player: controls,
        durationMs: 14000,
      })
    );
    expect(result.current.range).toEqual({ startMs: 5000, endMs: 9000 });
    expect(result.current.link).toBe(
      'http://localhost:3000/api/share/videos/v1?start_ms=5000&end_ms=9000'
    );
    expect(
      result.current.context.entries.map((entry) => [entry.segment.text, entry.selected])
    ).toEqual([
      ['zero', false],
      ['one', true],
      ['two', false],
    ]);
    act(() => result.current.setEnd('00:00:04'));
    expect(result.current.error).toBe('order');
    expect(controls.pause).toHaveBeenCalled();
    act(() => result.current.setEnd('20'));
    expect(result.current.error).toBe('beyond-recording');
    act(() => result.current.setEnd('9'));
    act(() => result.current.includePrevious());
    expect(result.current.start).toBe('00:00:00');
    act(() => result.current.includeNext());
    expect(result.current.end).toBe('00:00:14');
    act(() => result.current.setFromPlayback('start'));
    expect(result.current.start).toBe('00:00:07.500');
    act(() => result.current.preview());
    expect(controls.previewRange).toHaveBeenCalledWith(7.5, 14);
    expect(result.current.feedback).toBe('preview-requested');
  });

  it('shares the episode link when public passages are off and reports missing playback', async () => {
    const { result } = renderHook(() =>
      usePassageSelection({
        videoId: 'v1',
        title: 'Episode',
        initialRange: { startMs: 5000, endMs: 9000 },
        segments,
        player: player(null),
        shareUrl: 'episode',
      })
    );
    expect(result.current.link).toBe('http://localhost:3000/v/v1?t=5&end_ms=9000#moment-5000');
    act(() => result.current.setFromPlayback('end'));
    expect(result.current.feedback).toBe('playback-unavailable');
    await act(() => result.current.copyLink());
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(result.current.link);
    expect(result.current.feedback).toBe('link-copied');
  });
});

describe('copy helpers', () => {
  it('reports copy success and failure', async () => {
    const { result } = renderHook(() => useCopy());
    await act(async () => void (await result.current.copy('text', 'k')));
    expect(result.current.status).toBe('copied');
    expect(result.current.lastKey).toBe('k');
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new Error('denied'));
    await act(async () => void (await result.current.copy('text')));
    expect(result.current.status).toBe('failed');
  });

  it('formats quotes with the provider link builder', async () => {
    const { wrapper } = setup({}, { links: { episode: (id: string) => `/watch/${id}` } });
    const { result } = renderHook(() => useMomentActions({ videoId: 'v1', title: 'Episode' }), {
      wrapper,
    });
    await act(async () => void (await result.current.copyQuote('  some   words ', 61_000)));
    expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith(
      '“some words”\n\n— Episode, 00:01:01\nhttp://localhost:3000/watch/v1'
    );
  });
});
