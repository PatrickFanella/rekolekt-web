import { useInfiniteQuery, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useRekolekt } from '../provider/context';
import type { QueryState } from './queryState';
import type { StreamLibraryFilters } from '../types/api';
import type { TranscriptSourceMode } from '../client/client';

/**
 * Paginated episode library from `/videos`. Uses the API's cursor when it
 * returns one and falls back to offsets otherwise.
 */
export function useEpisodes(filters: StreamLibraryFilters = {}) {
  const { client } = useRekolekt();
  const limit = filters.limit ?? 24;
  const query = useInfiniteQuery({
    queryKey: ['rekolekt', client.baseUrl, 'episodes', filters],
    initialPageParam: { cursor: filters.cursor, offset: filters.offset ?? 0 },
    queryFn: ({ signal, pageParam }) =>
      client.listStreamLibrary(
        {
          ...filters,
          limit,
          cursor: pageParam.cursor,
          offset: pageParam.cursor ? undefined : pageParam.offset,
        },
        signal
      ),
    getNextPageParam: (lastPage, _pages, lastParam) => {
      if (!lastPage.page_info.has_next_page) return undefined;
      if (lastPage.page_info.next_cursor)
        return { cursor: lastPage.page_info.next_cursor, offset: 0 };
      return { cursor: undefined, offset: lastParam.offset + lastPage.items.length };
    },
  });
  const episodes = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data?.pages]
  );
  return {
    episodes,
    totalCount: query.data?.pages[0]?.page_info.total_count ?? null,
    loading: query.isPending,
    loadingMore: query.isFetchingNextPage,
    canLoadMore: Boolean(query.hasNextPage),
    loadMore: () => void query.fetchNextPage(),
    error: query.isError ? query.error : null,
    retry: () => void query.refetch(),
  };
}

function simple<T>(query: UseQueryResult<T>): QueryState<T> {
  return {
    data: query.data ?? null,
    loading: query.isPending && query.fetchStatus !== 'idle',
    error: query.isError ? query.error : null,
    retry: () => void query.refetch(),
  };
}

export function useRecentEpisodes(limit = 12) {
  const { client } = useRekolekt();
  return simple(
    useQuery({
      queryKey: ['rekolekt', client.baseUrl, 'recent-episodes', limit],
      queryFn: ({ signal }) => client.listRecentVideos(limit, signal),
    })
  );
}

export function useEpisode(videoId: string | null | undefined) {
  const { client } = useRekolekt();
  return simple(
    useQuery({
      queryKey: ['rekolekt', client.baseUrl, 'episode', videoId],
      enabled: Boolean(videoId),
      queryFn: ({ signal }) => client.getVideo(videoId!, signal),
    })
  );
}

export function useEpisodeChapters(videoId: string | null | undefined) {
  const { client } = useRekolekt();
  return simple(
    useQuery({
      queryKey: ['rekolekt', client.baseUrl, 'chapters', videoId],
      enabled: Boolean(videoId),
      queryFn: ({ signal }) => client.getVideoChapters(videoId!, signal),
    })
  );
}

/** Raw transcript response. Pair with `useTranscriptTurns` to group it for reading. */
export function useTranscript(
  videoId: string | null | undefined,
  source: TranscriptSourceMode = 'best'
) {
  const { client } = useRekolekt();
  return simple(
    useQuery({
      queryKey: ['rekolekt', client.baseUrl, 'transcript', videoId, source],
      enabled: Boolean(videoId),
      queryFn: ({ signal }) => client.getTranscript(videoId!, source, signal),
    })
  );
}

/** Related episodes and frequently quoted moments for one episode. */
export function useEpisodeIntelligence(videoId: string | null | undefined) {
  const { client } = useRekolekt();
  const query = useQuery({
    queryKey: ['rekolekt', client.baseUrl, 'episode-intelligence', videoId],
    enabled: Boolean(videoId),
    queryFn: async ({ signal }) => {
      const [related, quoted] = await Promise.all([
        client.getRelatedEpisodes(videoId!, signal),
        client.getQuotedMoments(videoId!, signal),
      ]);
      return { related: related.items ?? [], quoted: quoted.items ?? [] };
    },
  });
  return {
    related: query.data?.related ?? null,
    quoted: query.data?.quoted ?? null,
    loading: query.isPending && query.fetchStatus !== 'idle',
    error: query.isError ? query.error : null,
  };
}

export function useArchiveSummary() {
  const { client } = useRekolekt();
  return simple(
    useQuery({
      queryKey: ['rekolekt', client.baseUrl, 'archive-summary'],
      queryFn: ({ signal }) => client.getArchiveSummary(signal),
    })
  );
}

export function useArchiveTimeline() {
  const { client } = useRekolekt();
  return simple(
    useQuery({
      queryKey: ['rekolekt', client.baseUrl, 'archive-timeline'],
      queryFn: ({ signal }) => client.getTimeline(signal),
    })
  );
}
