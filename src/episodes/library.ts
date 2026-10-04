import type { StreamLibraryFilters, VideoInfo } from '../types/api';
import { titleCase } from '../format/format';

export const DEFAULT_LIMIT = 24;

export const DATE_FIELDS = ['uploaded_at', 'created_at', 'updated_at'] as const;

export type DateField = NonNullable<StreamLibraryFilters['date_field']>;

export type LibraryFilterState = {
  q: string;
  completedOnly: boolean;
  dateField: DateField;
  dateFrom: string;
  dateTo: string;
  category: string;
};

/** Read episode-library filters from URL parameters, with safe defaults. */
export function parseLibraryFilters(params: URLSearchParams): LibraryFilterState {
  const dateFieldParam = params.get('date_field');
  const dateField = DATE_FIELDS.some((value) => value === dateFieldParam)
    ? (dateFieldParam as DateField)
    : 'uploaded_at';

  return {
    q: params.get('q') ?? '',
    completedOnly: params.get('completed_only') === 'true',
    dateField,
    dateFrom: params.get('date_from') ?? '',
    dateTo: params.get('date_to') ?? '',
    category: params.get('category') ?? '',
  };
}

/** Convert library filter state to API filters. */
export function libraryFiltersToQuery(
  state: LibraryFilterState,
  limit = DEFAULT_LIMIT
): StreamLibraryFilters {
  return {
    limit,
    q: state.q || undefined,
    completed_only: state.completedOnly || undefined,
    date_field: state.dateField,
    date_from: state.dateFrom || undefined,
    date_to: state.dateTo || undefined,
    category: state.category || undefined,
  };
}

export type EpisodeStatus = 'attention' | 'ready' | 'processing' | 'unknown';

/**
 * Summarize an episode's processing, caption and diarization states. Returns a
 * status code for styling and the raw state label for `unknown`.
 */
export function episodeStatus(video: VideoInfo): { status: EpisodeStatus; label: string } {
  const states = [video.state, video.caption_ingest_state, video.diarization_state]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  if (states.some((value) => /error|failed|cancel/.test(value)))
    return { status: 'attention', label: 'Needs attention' };
  if (states.some((value) => /ready|complete|done|finished/.test(value)))
    return { status: 'ready', label: 'Ready' };
  if (states.some((value) => /process|queue|pending|transcrib|ingest|sync/.test(value)))
    return { status: 'processing', label: 'Processing' };
  return { status: 'unknown', label: titleCase(video.state ?? 'Unknown') };
}

/** YouTube thumbnail for an episode's source recording. */
export function episodeThumbnailUrl(video: Pick<VideoInfo, 'youtube_id'>, size = 'hqdefault') {
  return `https://i.ytimg.com/vi/${encodeURIComponent(video.youtube_id)}/${size}.jpg`;
}
