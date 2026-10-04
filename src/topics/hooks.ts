import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useRekolekt } from '../provider/context';
import type { QueryState } from '../episodes/queryState';
import type { ExploreIntelligenceQuery } from '../types/api';

function state<T>(query: UseQueryResult<T>): QueryState<T> {
  return {
    data: query.data ?? null,
    loading: query.isPending && query.fetchStatus !== 'idle',
    error: query.isError ? query.error : null,
    retry: () => void query.refetch(),
  };
}

/** Topic cards, people, tags, trending searches and periods from `/archive/intelligence`. */
export function useArchiveIntelligence(options?: ExploreIntelligenceQuery) {
  const { client } = useRekolekt();
  return state(
    useQuery({
      queryKey: ['rekolekt', client.baseUrl, 'intelligence', options ?? null],
      queryFn: ({ signal }) => client.getExploreIntelligence(options, signal),
      staleTime: 5 * 60_000,
    })
  );
}

/** Mention counts over time for one topic. */
export function useTopicTimeline(
  slug: string | null | undefined,
  options?: { granularity?: 'week' | 'month'; date_from?: string; date_to?: string }
) {
  const { client } = useRekolekt();
  return state(
    useQuery({
      queryKey: ['rekolekt', client.baseUrl, 'topic-timeline', slug, options ?? null],
      enabled: Boolean(slug),
      queryFn: ({ signal }) => client.getTopicTimeline(slug!, options, signal),
    })
  );
}

/** Published opinion history for one topic, with evidence and corrections. */
export function useTopicOpinions(slug: string | null | undefined) {
  const { client } = useRekolekt();
  return state(
    useQuery({
      queryKey: ['rekolekt', client.baseUrl, 'topic-opinions', slug],
      enabled: Boolean(slug),
      queryFn: ({ signal }) => client.getTopicOpinions(slug!, signal),
    })
  );
}
