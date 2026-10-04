import type { ArchiveSearchFilters, SavedSearchFilters } from '../types/api';

export type EpisodeLinkOptions = {
  /** Start position in milliseconds; adds `t` (seconds) and, if needed, `t_ms`. */
  startMs?: number;
  /** End of a passage in milliseconds; adds `end_ms`. */
  endMs?: number;
  /** Search query to highlight; adds `q`. */
  query?: string;
  /** Ask the episode view to play the search matches in order; adds `play=matches`. */
  playMatches?: boolean;
};

/**
 * Where the kit's components link to. The defaults match the routes Rekolekt's
 * API already emits in share redirects and exports (`/v/:videoId?t=`), so keep
 * `episode` compatible with those if you change it.
 */
export type ArchiveLinks = {
  episode: (videoId: string, options?: EpisodeLinkOptions) => string;
  search: (query: string, filters?: ArchiveSearchFilters | SavedSearchFilters) => string;
  topic: (slug: string) => string;
};

export function momentAnchorId(startMs: number) {
  return `moment-${Math.max(0, Math.floor(startMs))}`;
}

export function episodeLink(videoId: string, options: EpisodeLinkOptions = {}, basePath = '/v') {
  const params = new URLSearchParams();
  const { startMs, endMs, query, playMatches } = options;
  if (startMs != null && Number.isFinite(startMs)) {
    const safeStart = Math.max(0, Math.floor(startMs));
    params.set('t', String(Math.floor(safeStart / 1000)));
    if (safeStart % 1000 !== 0) params.set('t_ms', String(safeStart));
  }
  if (endMs != null && Number.isFinite(endMs)) params.set('end_ms', String(Math.floor(endMs)));
  if (query) params.set('q', query);
  if (playMatches) params.set('play', 'matches');
  const search = params.toString();
  const hash = startMs != null && Number.isFinite(startMs) ? `#${momentAnchorId(startMs)}` : '';
  return `${basePath.replace(/\/+$/, '')}/${encodeURIComponent(videoId)}${search ? `?${search}` : ''}${hash}`;
}

export function searchLink(
  query: string,
  filters: ArchiveSearchFilters | SavedSearchFilters = {},
  path = '/search'
) {
  const params = new URLSearchParams({ q: query });
  for (const [key, value] of Object.entries(filters)) {
    // `source` selects a transcript variant the search page chooses itself.
    if (key === 'source') continue;
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  return `${path}?${params.toString()}`;
}

export const defaultLinks: ArchiveLinks = {
  episode: (videoId, options) => episodeLink(videoId, options),
  search: (query, filters) => searchLink(query, filters),
  topic: (slug) => `/topics/${encodeURIComponent(slug)}`,
};

export function createArchiveLinks(overrides?: Partial<ArchiveLinks>): ArchiveLinks {
  return { ...defaultLinks, ...overrides };
}

/** Make a relative link absolute for copying or sharing outside the page. */
export function absoluteUrl(path: string, origin?: string) {
  const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : '');
  if (/^https?:\/\//i.test(path)) return path;
  return `${base}${path}`;
}
