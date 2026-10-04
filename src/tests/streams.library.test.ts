import { describe, expect, it } from 'vitest';
import {
  episodeStatus,
  episodeThumbnailUrl,
  libraryFiltersToQuery,
  parseLibraryFilters,
} from '../episodes/library';

describe('episode library helpers', () => {
  it('parses query filters and converts them to API filters', () => {
    const filters = parseLibraryFilters(
      new URLSearchParams({ q: 'vod', completed_only: 'true', date_field: 'created_at' })
    );

    expect(filters).toEqual({
      q: 'vod',
      completedOnly: true,
      dateField: 'created_at',
      dateFrom: '',
      dateTo: '',
      category: '',
    });
    expect(libraryFiltersToQuery(filters, 12)).toEqual({
      limit: 12,
      q: 'vod',
      completed_only: true,
      date_field: 'created_at',
      date_from: undefined,
      date_to: undefined,
      category: undefined,
    });
    expect(parseLibraryFilters(new URLSearchParams({ date_field: 'bogus' })).dateField).toBe(
      'uploaded_at'
    );
  });

  it('summarizes processing states as a status code', () => {
    expect(
      episodeStatus({
        state: 'ready',
        caption_ingest_state: 'done',
        diarization_state: 'done',
      } as never)
    ).toEqual({ status: 'ready', label: 'Ready' });
    expect(episodeStatus({ state: 'queued' } as never).status).toBe('processing');
    expect(episodeStatus({ state: 'failed' } as never).status).toBe('attention');
    expect(episodeStatus({ state: 'odd_state' } as never)).toEqual({
      status: 'unknown',
      label: 'Odd State',
    });
  });

  it('builds the source thumbnail URL', () => {
    expect(episodeThumbnailUrl({ youtube_id: 'abc' })).toBe(
      'https://i.ytimg.com/vi/abc/hqdefault.jpg'
    );
  });
});
