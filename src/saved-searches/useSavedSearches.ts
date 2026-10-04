import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRekolekt } from '../provider/context';
import { useOptionalAuth } from '../auth/auth';
import type { SavedSearch, SavedSearchFilters } from '../types/api';
import { localSavedSearches, savedSearchKey } from './localSavedSearches';

const EMPTY: SavedSearch[] = [];

/** Saved searches: API-backed when signed in, localStorage otherwise. */
export function useSavedSearches() {
  const { client } = useRekolekt();
  const auth = useOptionalAuth();
  const signedIn = Boolean(auth?.user);
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => ['rekolekt', client.baseUrl, 'saved-searches', auth?.user?.id ?? null],
    [auth?.user?.id, client.baseUrl]
  );
  const server = useQuery({
    queryKey,
    enabled: signedIn,
    queryFn: ({ signal }) => client.listSavedSearches(signal),
  });
  const local = useSyncExternalStore(
    localSavedSearches.subscribe,
    localSavedSearches.snapshot,
    localSavedSearches.snapshot
  );
  const items = signedIn ? (server.data?.items ?? EMPTY) : (local as SavedSearch[]);

  const isSaved = useCallback(
    (query: string, filters: SavedSearchFilters = {}) => {
      const key = savedSearchKey(query, filters);
      return items.some((item) => savedSearchKey(item.query, item.filters ?? {}) === key);
    },
    [items]
  );

  const save = useCallback(
    async (query: string, filters: SavedSearchFilters = {}) => {
      if (!query.trim() || isSaved(query, filters)) return null;
      if (!signedIn) return localSavedSearches.add(query.trim(), filters);
      const created = await client.createSavedSearch({ query: query.trim(), filters });
      queryClient.setQueryData<{ items: SavedSearch[] }>(queryKey, (current) => ({
        items: [created, ...(current?.items ?? [])],
      }));
      return created;
    },
    [client, isSaved, queryClient, queryKey, signedIn]
  );

  const remove = useCallback(
    async (id: string) => {
      if (!signedIn || id.startsWith('local:')) {
        localSavedSearches.remove(id);
        return;
      }
      await client.deleteSavedSearch(id);
      queryClient.setQueryData<{ items: SavedSearch[] }>(queryKey, (current) =>
        current ? { items: current.items.filter((item) => item.id !== id) } : current
      );
    },
    [client, queryClient, queryKey, signedIn]
  );

  return {
    items,
    storage: signedIn ? ('server' as const) : ('local' as const),
    loading: signedIn && server.isPending,
    error: server.isError ? server.error : null,
    isSaved,
    save,
    remove,
  };
}
