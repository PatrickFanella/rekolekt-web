// Client and types
export {
  createRekolektClient,
  buildApiUrl,
  appendSearchFilters,
  normalizeVideosResponse,
  type RekolektClient,
  type RekolektClientOptions,
  type FavoriteRecord,
  type TranscriptSourceMode,
  type SearchParamsInit,
} from './client/client';
export type * from './types/api';
export type { paths as ApiPaths, components as ApiComponents } from './types/generated/api';

// Provider, site and session
export {
  RekolektProvider,
  createQueryClient,
  type RekolektProviderProps,
} from './provider/RekolektProvider';
export { useRekolekt, useRekolektClient, type RekolektContextValue } from './provider/context';
export {
  SiteProvider,
  useSite,
  loadSiteConfig,
  type SiteState,
  type SiteStatus,
} from './site/site';
export {
  defaultSiteConfig,
  isSiteConfig,
  resolveSiteConfig,
  type SiteConfig,
} from './site/siteConfig';
export {
  AuthProvider,
  useAuth,
  useOptionalAuth,
  type AuthState,
  type AuthStatus,
  type User,
} from './auth/auth';
export {
  StringsProvider,
  useStrings,
  defaultStrings,
  type RekolektStrings,
} from './strings/strings';
export {
  createAnalytics,
  type Analytics,
  type AnalyticsEvent,
  type AnalyticsEventType,
} from './analytics/analytics';
export { createCommunityApi, type CommunityApi } from './community/community';
export type { CommunityPost, CommunityReport, PostPage, TimelinePage } from './community/community';

// Formatting and links
export * from './format/format';
export {
  createArchiveLinks,
  defaultLinks,
  episodeLink,
  searchLink,
  momentAnchorId,
  absoluteUrl,
  type ArchiveLinks,
  type EpisodeLinkOptions,
} from './format/links';

// Search
export {
  readFilters,
  serializeFilters,
  buildCurrentFilters,
  type SearchFilters,
} from './search/filters';
export { parseLegacyHighlightedSnippet, normalizeHighlightRanges } from './search/highlights';
export { clusterNearbyMoments, NEARBY_MATCH_WINDOW_MS } from './search/clusters';
export {
  plainTextFromSnippet,
  formatQuote,
  buildQuoteText,
  buildPlayMatchesLink,
} from './search/moments';
export { bucketMomentsByDate, type DateBucket } from './search/insights';
export { playbackQueue } from './search/playbackQueue';
export {
  useArchiveSearch,
  useSearchSuggestions,
  mergeSearchPages,
  SEARCH_PAGE_SIZE,
  type ArchiveSearchState,
} from './search/useArchiveSearch';

// Episodes and topics
export * from './episodes/library';
export {
  useEpisodes,
  useRecentEpisodes,
  useEpisode,
  useEpisodeChapters,
  useTranscript,
  useEpisodeIntelligence,
  useArchiveSummary,
  useArchiveTimeline,
} from './episodes/hooks';
export { useArchiveIntelligence, useTopicTimeline, useTopicOpinions } from './topics/hooks';
export type { QueryState } from './episodes/queryState';

// Transcript, passages and player
export * from './transcript/transcript';
export * from './transcript/topics';
export * from './transcript/window';
export * from './transcript/progressiveChapters';
export * from './transcript/passages';
export {
  usePlaybackTime,
  useActiveSegmentIndex,
  findSegmentIndexAt,
} from './transcript/usePlaybackSync';
export {
  usePassageSelection,
  type PassageFeedback,
  type PassageContext,
} from './transcript/usePassageSelection';
export { useMomentActions } from './transcript/useMomentActions';
export {
  useYouTubePlayer,
  type PlayerHandle,
  type PlayerStatus,
  type PlayerError,
} from './player/useYouTubePlayer';
export { loadYouTubeApi } from './player/youtubeApi';

// Saved items and clipboard
export { localFavorites, type FavoriteItem } from './favorites/localFavorites';
export { useFavorites, type SavedMoment, type SaveMomentInput } from './favorites/useFavorites';
export { localSavedSearches, savedSearchKey } from './saved-searches/localSavedSearches';
export { useSavedSearches } from './saved-searches/useSavedSearches';
export { useCopy, copyText, type CopyStatus } from './clipboard/useCopy';

// Default components
export * from './components';
