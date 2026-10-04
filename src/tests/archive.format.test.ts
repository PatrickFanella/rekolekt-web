import { describe, expect, it } from 'vitest';
import { formatAggregateDuration, formatVideoTitle } from '../format/format';
import { episodeLink, searchLink } from '../format/links';

const buildTimestampLink = (videoId: string, startMs: number) => episodeLink(videoId, { startMs });

describe('archive moment links', () => {
  it('uses the exact start time as a source-neutral canonical anchor', () => {
    expect(buildTimestampLink('video-1', 5_956_000)).toBe('/v/video-1?t=5956#moment-5956000');
  });

  it('preserves exact milliseconds for moments that begin after a transcript gap', () => {
    expect(buildTimestampLink('video-1', 16_518_140)).toBe(
      '/v/video-1?t=16518&t_ms=16518140#moment-16518140'
    );
    expect(buildTimestampLink('video-1', 16_518_140)).toBe(
      '/v/video-1?t=16518&t_ms=16518140#moment-16518140'
    );
  });

  it('uses an intentional date treatment for missing or dangling titles', () => {
    expect(formatVideoTitle('HasanAbi broadcast —', '2026-08-07T00:00:00Z')).toBe(
      'HasanAbi broadcast'
    );
    expect(formatVideoTitle('', '2026-08-07T00:00:00Z')).toMatch(/^Broadcast from /);
    expect(formatVideoTitle('HasanAbi July 10, 2026 –', null)).toBe('HasanAbi July 10, 2026');
  });

  it('lets archives replace the wording for date-only titles', () => {
    expect(formatVideoTitle('July 10, 2026', null, { dated: (date) => `Episode of ${date}` })).toBe(
      'Episode of July 10, 2026'
    );
    expect(formatVideoTitle(null, null, { untitled: 'Untitled' })).toBe('Untitled');
  });

  it('builds passage, query and search links', () => {
    expect(
      episodeLink('v 1', { startMs: 1500, endMs: 4000, query: 'rent', playMatches: true })
    ).toBe('/v/v%201?t=1&t_ms=1500&end_ms=4000&q=rent&play=matches#moment-1500');
    expect(episodeLink('v1')).toBe('/v/v1');
    expect(searchLink('rent', { source: 'best', date_from: '2026-01-01', limit: undefined })).toBe(
      '/search?q=rent&date_from=2026-01-01'
    );
  });

  it('formats archive-scale runtime for humans', () => {
    expect(formatAggregateDuration(16_378.6 * 3600)).toMatch(/^16\.4k hours$/);
  });
});
