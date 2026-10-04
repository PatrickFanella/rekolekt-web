import type { SavedSearch, SavedSearchFilters } from '../types/api';

const KEY = 'saved-searches:v1';

export function savedSearchKey(query: string, filters: SavedSearchFilters) {
  return JSON.stringify([
    query.trim(),
    filters.source ?? null,
    filters.category ?? null,
    filters.date_from ?? null,
    filters.date_to ?? null,
    filters.min_duration ?? null,
    filters.max_duration ?? null,
    filters.sort_by ?? null,
    filters.video_id ?? null,
    filters.limit ?? null,
    filters.offset ?? null,
  ]);
}

function load(): SavedSearch[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as SavedSearch[];
  } catch {
    return [];
  }
}

function save(items: SavedSearch[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // The UI retains its current in-memory state if browser storage is unavailable.
  }
}

let cache = load();
const listeners = new Set<() => void>();
function notify() {
  for (const listener of listeners) listener();
}

/** Signed-out saved searches, kept in localStorage under `saved-searches:v1`. */
export const localSavedSearches = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  /** Stable reference until the next change (for useSyncExternalStore). */
  snapshot(): readonly SavedSearch[] {
    return cache;
  },
  list: () => [...cache],
  reload() {
    cache = load();
    notify();
    return [...cache];
  },
  add(query: string, filters: SavedSearchFilters) {
    const item: SavedSearch = {
      id: `local:${crypto.randomUUID()}`,
      query,
      filters,
      created_at: new Date().toISOString(),
    };
    cache = [item, ...cache];
    save(cache);
    notify();
    return item;
  },
  remove(id: string) {
    cache = cache.filter((item) => item.id !== id);
    save(cache);
    notify();
  },
};
