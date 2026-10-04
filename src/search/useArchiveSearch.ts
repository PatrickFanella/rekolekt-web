import { useEffect, useMemo } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useRekolekt } from '../provider/context';
import type { ArchiveSearchFilters, EpisodeSearchGroup, GroupedSearchResponse } from '../types/api';
import type { SearchFilters } from './filters';

export const SEARCH_PAGE_SIZE = 20;

/** Merge paginated grouped results so a later page extends, not replaces, an episode group. */
export function mergeSearchPages(pages: GroupedSearchResponse[]): GroupedSearchResponse | null {
  if (!pages.length) return null;
  const byVideo = new Map<string, EpisodeSearchGroup>();
  for (const page of pages) {
    for (const group of page.groups) {
      const existing = byVideo.get(group.video.id);
      if (existing) existing.moments.push(...group.moments);
      else byVideo.set(group.video.id, { ...group, moments: [...group.moments] });
    }
  }
  const latest = pages.at(-1)!;
  return {
    ...latest,
    groups: [...byVideo.values()],
    total_moments: [...byVideo.values()].reduce((total, group) => total + group.moments.length, 0),
    total_videos: byVideo.size,
  };
}

export type ArchiveSearchState = {
  /** False while the query is blank; nothing is requested. */
  enabled: boolean;
  results: GroupedSearchResponse | null;
  /** Initial request in flight. A later page uses `loadingMore` instead. */
  loading: boolean;
  loadingMore: boolean;
  canLoadMore: boolean;
  loadMore: () => void;
  error: unknown;
  retry: () => void;
};

/** Grouped transcript search with offset pagination. */
export function useArchiveSearch(
  filters: SearchFilters,
  { pageSize = SEARCH_PAGE_SIZE }: { pageSize?: number } = {}
): ArchiveSearchState {
  const { client, analytics } = useRekolekt();
  const query = filters.q.trim();
  const enabled = Boolean(query);
  const activeFilters: ArchiveSearchFilters = useMemo(
    () => ({
      match_mode: filters.match_mode ?? 'topic',
      date_from: filters.date_from,
      date_to: filters.date_to,
      sort_by: filters.sort_by,
      video_id: filters.video_id,
      category: filters.category,
      limit: pageSize,
    }),
    [
      filters.match_mode,
      filters.date_from,
      filters.date_to,
      filters.sort_by,
      filters.video_id,
      filters.category,
      pageSize,
    ]
  );
  const search = useInfiniteQuery({
    queryKey: ['rekolekt', client.baseUrl, 'search', query, activeFilters],
    enabled,
    retry: false,
    initialPageParam: 0,
    queryFn: ({ signal, pageParam }) =>
      client.searchGrouped(query, { ...activeFilters, offset: pageParam }, signal),
    getNextPageParam: (lastPage) =>
      lastPage.page_info?.has_next_page ? (lastPage.page_info.next_offset ?? undefined) : undefined,
  });

  useEffect(() => {
    if (enabled) analytics?.track({ type: 'search', payload: { ...activeFilters } });
  }, [activeFilters, analytics, enabled, query]);

  const results = useMemo(() => mergeSearchPages(search.data?.pages ?? []), [search.data?.pages]);
  return {
    enabled,
    results,
    loading: enabled && search.isPending,
    loadingMore: search.isFetchingNextPage,
    canLoadMore: Boolean(search.hasNextPage),
    loadMore: () => void search.fetchNextPage(),
    error: search.isError ? search.error : null,
    retry: () => void search.refetch(),
  };
}

/** Popular or prefix-matched search terms from `/search/suggestions`. */
export function useSearchSuggestions(prefix: string, limit = 10) {
  const { client } = useRekolekt();
  const query = useQuery({
    queryKey: ['rekolekt', client.baseUrl, 'search-suggestions', prefix, limit],
    enabled: prefix.trim().length > 0,
    queryFn: ({ signal }) => client.getSearchSuggestions(prefix.trim(), limit, signal),
  });
  return {
    suggestions: query.data?.suggestions ?? [],
    loading: query.isPending && query.fetchStatus !== 'idle',
    error: query.isError ? query.error : null,
  };
}
