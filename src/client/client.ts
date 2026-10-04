import ky, { type KyInstance, type Options as KyOptions } from 'ky';
import type {
  AccountResponse,
  ActiveSession,
  ArchiveDiscoveryResponse,
  ArchivePeriodOptionsResponse,
  ArchiveSearchFilters,
  ArchiveSummary,
  ExploreIntelligenceQuery,
  ExploreIntelligenceResponse,
  GroupedSearchResponse,
  LinkedIdentity,
  LinkProviderResponse,
  MentionCollectionResponse,
  MentionMapResponse,
  OAuthProvider,
  OpinionHistoryResponse,
  PaginatedVideos,
  ProfileResponse,
  QuotedMomentsResponse,
  RelatedEpisodesResponse,
  SavedSearch,
  SavedSearchFilters,
  SearchResponse,
  SearchSuggestionsResponse,
  StreamLibraryFilters,
  SupportConfig,
  TimelineBucket,
  TimelineResponse,
  TopicTimelineResponse,
  TranscriptResponse,
  VideoChaptersResponse,
  VideoInfo,
} from '../types/api';
import type { SiteConfig } from '../site/siteConfig';

export type SearchParamsInit =
  URLSearchParams | Record<string, string | number | boolean | null | undefined>;

export type RekolektClientOptions = {
  /**
   * Where the Rekolekt API is mounted, relative to the page (`/api`) or absolute
   * (`https://archive.example/api`). Defaults to `/api`.
   */
  baseUrl?: string;
  /** Request timeout in milliseconds. Defaults to 15 seconds. */
  timeout?: number;
  /** Cookie mode. Session cookies need `include`, the default. */
  credentials?: RequestCredentials;
  /** Custom fetch, for example a server-side fetch with forwarded cookies. */
  fetch?: typeof fetch;
};

export type FavoriteRecord = {
  id: string;
  video_id: string;
  start_ms: number;
  end_ms: number;
  text?: string;
};

export type TranscriptSourceMode = 'best' | 'merged' | 'whisper' | 'youtube';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Join an API base and path, adding query parameters while skipping null values. */
export function buildApiUrl(path = '', searchParams?: SearchParamsInit, base = '/api') {
  const normalizedBase = base.replace(/\/+$/, '');
  const normalizedPath = path.replace(/^\/+/, '');
  const url = normalizedPath
    ? `${normalizedBase ? `${normalizedBase}/` : '/'}${normalizedPath}`
    : normalizedBase || '/';

  if (!searchParams) return url;

  const params = searchParams instanceof URLSearchParams ? searchParams : new URLSearchParams();
  if (!(searchParams instanceof URLSearchParams)) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value == null) continue;
      params.set(key, String(value));
    }
  }

  const query = params.toString();
  return query ? `${url}?${query}` : url;
}

/** Ky needs an absolute prefix outside browsers; resolve a relative base against the page. */
function resolvePrefix(base: string) {
  if (/^https?:\/\//i.test(base)) return base;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return new URL(base || '/', window.location.origin).href;
  }
  return base;
}

export function appendSearchFilters(params: URLSearchParams, opts?: ArchiveSearchFilters) {
  if (!opts) return;
  if (opts.match_mode) params.set('match_mode', opts.match_mode);
  if (opts.source) params.set('source', opts.source);
  if (opts.category) params.set('category', opts.category);
  if (opts.video_id) params.set('video_id', opts.video_id);
  if (opts.limit != null) params.set('limit', String(opts.limit));
  if (opts.offset != null) params.set('offset', String(opts.offset));
  if (opts.date_from) params.set('date_from', opts.date_from);
  if (opts.date_to) params.set('date_to', opts.date_to);
  if (opts.min_duration != null) params.set('min_duration', String(opts.min_duration));
  if (opts.max_duration != null) params.set('max_duration', String(opts.max_duration));
  if (opts.sort_by) params.set('sort_by', opts.sort_by);
}

export function normalizeVideosResponse(response: PaginatedVideos | VideoInfo[]): PaginatedVideos {
  if (Array.isArray(response)) {
    return {
      items: response,
      page_info: {
        has_next_page: false,
        has_previous_page: false,
        next_cursor: null,
        previous_cursor: null,
        total_count: response.length,
      },
    };
  }

  return {
    items: response.items ?? [],
    page_info: response.page_info ?? {
      has_next_page: false,
      has_previous_page: false,
      next_cursor: null,
      previous_cursor: null,
      total_count: response.items?.length ?? 0,
    },
  };
}

function normalizeTimelineResponse(
  response:
    TimelineResponse | TimelineBucket[] | { buckets?: TimelineBucket[]; items?: TimelineBucket[] }
) {
  if (Array.isArray(response)) return response;
  return response.buckets ?? response.items ?? [];
}

function streamLibraryParams(filters: StreamLibraryFilters) {
  const searchParams = new URLSearchParams({ limit: String(filters.limit ?? 12) });
  if (filters.offset != null) searchParams.set('offset', String(filters.offset));
  if (filters.cursor) searchParams.set('cursor', filters.cursor);
  if (filters.sort) searchParams.set('sort', filters.sort);
  if (filters.completed_only !== undefined)
    searchParams.set('completed_only', String(filters.completed_only));
  if (filters.q) searchParams.set('q', filters.q);
  if (filters.date_field) searchParams.set('date_field', filters.date_field);
  if (filters.date_from) searchParams.set('date_from', filters.date_from);
  if (filters.date_to) searchParams.set('date_to', filters.date_to);
  if (filters.category) searchParams.set('category', filters.category);
  for (const person of filters.people ?? []) searchParams.append('people', person);
  for (const tag of filters.tags ?? []) searchParams.append('tags', tag);
  if (filters.min_duration != null) searchParams.set('min_duration', String(filters.min_duration));
  if (filters.max_duration != null) searchParams.set('max_duration', String(filters.max_duration));
  if (filters.transcript_source) searchParams.set('transcript_source', filters.transcript_source);
  return searchParams;
}

/**
 * Create a typed client for one Rekolekt API. The client keeps its own CSRF
 * token in memory and adds it to unsafe requests; nothing is stored globally.
 */
export function createRekolektClient(options: RekolektClientOptions = {}) {
  const baseUrl = options.baseUrl ?? '/api';
  let csrfToken: string | null = null;

  const kyOptions: KyOptions = {
    prefixUrl: resolvePrefix(baseUrl),
    timeout: options.timeout ?? 15_000,
    credentials: options.credentials ?? 'include',
    hooks: {
      beforeRequest: [
        (request) => {
          if (UNSAFE_METHODS.has(request.method.toUpperCase()) && csrfToken) {
            request.headers.set('X-CSRF-Token', csrfToken);
          }
        },
      ],
    },
  };
  if (options.fetch) kyOptions.fetch = options.fetch;
  const http: KyInstance = ky.create(kyOptions);

  const client = {
    baseUrl,
    /** The underlying Ky instance, for endpoints the client does not wrap. */
    http,
    /** Build an absolute-or-relative URL under this API, e.g. for OAuth redirects. */
    url(path = '', searchParams?: SearchParamsInit) {
      return buildApiUrl(path, searchParams, baseUrl);
    },
    getCsrfToken: () => csrfToken,
    setCsrfToken(token: string | null) {
      csrfToken = token;
    },

    getSite(signal?: AbortSignal) {
      return http.get('site', { signal }).json<SiteConfig>();
    },
    getSupportConfig() {
      return http.get('support').json<SupportConfig>();
    },
    getHealth(signal?: AbortSignal) {
      return http.get('health', { signal }).json<Record<string, unknown>>();
    },

    // Session and account
    getSession(signal?: AbortSignal) {
      return http.get('auth/me', { signal }).json<{
        user: {
          id: string;
          email?: string | null;
          name?: string | null;
          avatar_url?: string | null;
          plan?: string | null;
          role?: 'user' | 'moderator' | 'admin' | null;
        } | null;
        role?: 'user' | 'moderator' | 'admin' | null;
        capabilities?: string[];
      }>();
    },
    getCsrf(signal?: AbortSignal) {
      return http.get('auth/csrf', { signal }).json<{ csrf_token: string }>();
    },
    logout() {
      return http.post('auth/logout').json<unknown>();
    },
    /** URL that starts an OAuth sign-in with the given provider. */
    loginUrl(provider: OAuthProvider) {
      return buildApiUrl(`auth/login/${provider}`, undefined, baseUrl);
    },
    getAccount() {
      return http.get('account').json<AccountResponse>();
    },
    updateProfile(payload: { name: string; avatar_url: string | null }) {
      return http.patch('account', { json: payload }).json<ProfileResponse>();
    },
    listIdentities() {
      return http.get('account/identities').json<{ identities: LinkedIdentity[] }>();
    },
    linkProvider(provider: OAuthProvider) {
      return http.post(`account/identities/${provider}/link`).json<LinkProviderResponse>();
    },
    mergeProvider(provider: OAuthProvider) {
      return http.post(`account/identities/${provider}/merge`).json<LinkProviderResponse>();
    },
    unlinkProvider(provider: OAuthProvider) {
      return http.delete(`account/identities/${provider}`).json<{ ok: boolean }>();
    },
    unlinkIdentity(identityId: string) {
      return http
        .delete(`account/identities/by-id/${encodeURIComponent(identityId)}`)
        .json<{ ok: boolean }>();
    },
    listSessions() {
      return http.get('account/sessions').json<{ sessions: ActiveSession[] }>();
    },
    revokeSession(sessionId: string) {
      return http
        .delete(`account/sessions/${encodeURIComponent(sessionId)}`)
        .json<{ ok: boolean }>();
    },
    revokeSessions(keepCurrent: boolean) {
      return http
        .delete('account/sessions', { searchParams: { keep_current: String(keepCurrent) } })
        .json<{ revoked: number }>();
    },
    deleteAccount() {
      return http
        .delete('account', { json: { confirmation: 'DELETE' } })
        .json<{ deleted: boolean }>();
    },

    // Search
    search(q: string, opts?: ArchiveSearchFilters, signal?: AbortSignal) {
      const params = new URLSearchParams({ q });
      appendSearchFilters(params, opts);
      return http.get('search', { searchParams: params, signal }).json<SearchResponse>();
    },
    searchGrouped(q: string, opts?: ArchiveSearchFilters, signal?: AbortSignal) {
      const params = new URLSearchParams({ q });
      appendSearchFilters(params, opts);
      return http
        .get('search/grouped', { searchParams: params, signal })
        .json<GroupedSearchResponse>();
    },
    getMentionMap(q: string, opts?: ArchiveSearchFilters, signal?: AbortSignal) {
      const params = new URLSearchParams({ q });
      appendSearchFilters(params, opts);
      return http
        .get('search/mention-map', { searchParams: params, signal })
        .json<MentionMapResponse>();
    },
    getMentionCollection(q: string, opts?: ArchiveSearchFilters) {
      const params = new URLSearchParams({ q, format: 'json' });
      appendSearchFilters(params, opts);
      params.delete('offset');
      params.set('limit', '5000');
      return http
        .get('search/mentions/export', { searchParams: params })
        .json<MentionCollectionResponse>();
    },
    getSearchSuggestions(q: string, limit = 10, signal?: AbortSignal) {
      const searchParams = new URLSearchParams({ q, limit: String(limit) });
      return http
        .get('search/suggestions', { searchParams, signal })
        .json<SearchSuggestionsResponse>();
    },

    // Archive-wide views
    getArchiveSummary(signal?: AbortSignal) {
      return http.get('archive/summary', { signal }).json<ArchiveSummary>();
    },
    async getTimeline(signal?: AbortSignal) {
      const response = await http
        .get('archive/timeline', { signal })
        .json<TimelineResponse | TimelineBucket[]>();
      return normalizeTimelineResponse(response);
    },
    getTopicTimeline(
      slug: string,
      opts?: { granularity?: 'week' | 'month'; date_from?: string; date_to?: string },
      signal?: AbortSignal
    ) {
      return http
        .get(`archive/topics/${encodeURIComponent(slug)}/timeline`, { searchParams: opts, signal })
        .json<TopicTimelineResponse>();
    },
    getTopicOpinions(slug: string, signal?: AbortSignal) {
      return http
        .get(`archive/topics/${encodeURIComponent(slug)}/opinions`, { signal })
        .json<OpinionHistoryResponse>();
    },
    getExploreIntelligence(opts?: ExploreIntelligenceQuery, signal?: AbortSignal) {
      const params = new URLSearchParams();
      if (opts?.period) params.set('period', opts.period);
      if (opts?.topic_limit != null) params.set('topic_limit', String(opts.topic_limit));
      if (opts?.granularity) params.set('granularity', opts.granularity);
      if (opts?.period_limit != null) params.set('period_limit', String(opts.period_limit));
      if (opts?.date_from) params.set('date_from', opts.date_from);
      if (opts?.date_to) params.set('date_to', opts.date_to);
      return http
        .get('archive/intelligence', params.size ? { searchParams: params, signal } : { signal })
        .json<ExploreIntelligenceResponse>();
    },
    getExplorePeriods(opts?: { kind?: string; limit?: number }, signal?: AbortSignal) {
      const params = new URLSearchParams();
      if (opts?.kind) params.set('kind', opts.kind);
      if (opts?.limit != null) params.set('limit', String(opts.limit));
      return http
        .get(
          'archive/intelligence/periods',
          params.size ? { searchParams: params, signal } : { signal }
        )
        .json<ArchivePeriodOptionsResponse>();
    },
    listDiscovery(kind: 'topics' | 'moments', limit = 12, cursor?: string, signal?: AbortSignal) {
      const searchParams = new URLSearchParams({ kind, limit: String(limit) });
      if (cursor) searchParams.set('cursor', cursor);
      return http
        .get('archive/discovery', { searchParams, signal })
        .json<ArchiveDiscoveryResponse>();
    },

    // Episodes
    getVideo(videoId: string, signal?: AbortSignal) {
      return http.get(`videos/${encodeURIComponent(videoId)}`, { signal }).json<VideoInfo>();
    },
    getTranscript(videoId: string, source: TranscriptSourceMode = 'best', signal?: AbortSignal) {
      return http
        .get(`videos/${encodeURIComponent(videoId)}/transcript`, {
          searchParams: { mode: 'formatted', source },
          timeout: 60_000,
          signal,
        })
        .json<TranscriptResponse>();
    },
    getVideoChapters(videoId: string, signal?: AbortSignal) {
      return http
        .get(`videos/${encodeURIComponent(videoId)}/chapters`, { signal })
        .json<VideoChaptersResponse>();
    },
    getRelatedEpisodes(videoId: string, signal?: AbortSignal) {
      return http
        .get(`videos/${encodeURIComponent(videoId)}/related`, { signal })
        .json<RelatedEpisodesResponse>();
    },
    getQuotedMoments(videoId: string, signal?: AbortSignal) {
      return http
        .get(`videos/${encodeURIComponent(videoId)}/quoted-moments`, { signal })
        .json<QuotedMomentsResponse>();
    },
    async listRecentVideos(limit = 12, signal?: AbortSignal) {
      const response = await http
        .get('videos', {
          searchParams: { completed_only: 'true', limit: String(limit) },
          signal,
        })
        .json<PaginatedVideos | VideoInfo[]>();
      return normalizeVideosResponse(response).items;
    },
    async listStreamLibrary(filters: StreamLibraryFilters = {}, signal?: AbortSignal) {
      const response = await http
        .get('videos', { searchParams: streamLibraryParams(filters), signal })
        .json<PaginatedVideos | VideoInfo[]>();
      return normalizeVideosResponse(response);
    },

    // Signed-in user collections
    listFavorites(videoId?: string, signal?: AbortSignal) {
      const searchParams = videoId ? new URLSearchParams({ video_id: videoId }) : undefined;
      return http
        .get('users/me/favorites', { searchParams, signal })
        .json<{ items: FavoriteRecord[] }>();
    },
    addFavorite(payload: { video_id: string; start_ms: number; end_ms: number; text?: string }) {
      return http.post('users/me/favorites', { json: payload }).json<{ id: string }>();
    },
    deleteFavorite(id: string) {
      return http.delete(`users/me/favorites/${encodeURIComponent(id)}`).json<{ ok: boolean }>();
    },
    listSavedSearches(signal?: AbortSignal) {
      return http.get('users/me/saved-searches', { signal }).json<{ items: SavedSearch[] }>();
    },
    createSavedSearch(payload: { query: string; filters?: SavedSearchFilters }) {
      return http.post('users/me/saved-searches', { json: payload }).json<SavedSearch>();
    },
    deleteSavedSearch(id: string) {
      return http
        .delete(`users/me/saved-searches/${encodeURIComponent(id)}`)
        .json<{ ok: boolean }>();
    },

    /** Send analytics events; see `createAnalytics` for batching. */
    sendEvents(events: unknown[], requestOptions?: { keepalive?: boolean }) {
      return http
        .post('events/batch', { json: { events }, keepalive: requestOptions?.keepalive })
        .json<unknown>();
    },
  };
  return client;
}

export type RekolektClient = ReturnType<typeof createRekolektClient>;
