import type { TranscriptSource } from '../format/format';

type FavoriteKey = { videoId: string; segIndex: number };
export type FavoriteItem = FavoriteKey & {
  startMs: number;
  endMs: number;
  text: string;
  source?: TranscriptSource;
};

const KEY = 'favorites:v1';

function load(): FavoriteItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as FavoriteItem[]) : [];
  } catch {
    return [];
  }
}

function save(items: FavoriteItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // Suppress localStorage errors (e.g., storage full)
  }
}

let cache = load();
const listeners = new Set<() => void>();
function notify() {
  for (const listener of listeners) listener();
}

/** Signed-out saved moments, kept in localStorage under `favorites:v1`. */
export const localFavorites = {
  /** Call `listener` after any change; returns an unsubscribe function. */
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  /** Stable reference until the next change (for useSyncExternalStore). */
  snapshot(): readonly FavoriteItem[] {
    return cache;
  },
  list(): FavoriteItem[] {
    return [...cache];
  },
  reload(): FavoriteItem[] {
    cache = load();
    notify();
    return [...cache];
  },
  has(key: FavoriteKey): boolean {
    return cache.some((i) => i.videoId === key.videoId && i.segIndex === key.segIndex);
  },
  toggle(item: FavoriteItem) {
    if (this.has(item)) {
      cache = cache.filter((i) => !(i.videoId === item.videoId && i.segIndex === item.segIndex));
    } else {
      cache = [item, ...cache];
    }
    save(cache);
    notify();
  },
  remove(item: FavoriteItem) {
    cache = cache.filter(
      (candidate) =>
        !(
          candidate.videoId === item.videoId &&
          candidate.startMs === item.startMs &&
          candidate.endMs === item.endMs
        )
    );
    save(cache);
    notify();
  },
};
