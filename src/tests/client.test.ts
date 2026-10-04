import { describe, expect, it } from 'vitest';
import { buildApiUrl, createRekolektClient, normalizeVideosResponse } from '../client/client';
import { createTestClient } from './test-utils';

describe('createRekolektClient', () => {
  it('builds search URLs with every filter, including match_mode', async () => {
    const { client, calls } = createTestClient({ '/search/grouped': { groups: [] } });
    await client.searchGrouped('rent control', {
      match_mode: 'exact_phrase',
      date_from: '2026-01-01',
      sort_by: 'date_desc',
      video_id: 'v1',
      limit: 20,
      offset: 40,
      min_duration: 60,
    });
    const url = calls[0].url;
    expect(calls[0].path).toBe('/search/grouped');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      q: 'rent control',
      match_mode: 'exact_phrase',
      date_from: '2026-01-01',
      sort_by: 'date_desc',
      video_id: 'v1',
      limit: '20',
      offset: '40',
      min_duration: '60',
    });
  });

  it('sends the CSRF token on unsafe requests only', async () => {
    const { client, calls } = createTestClient({
      '/videos/v1': { id: 'v1', youtube_id: 'y' },
      'POST /users/me/favorites': { id: 'f1' },
    });
    client.setCsrfToken('token-1');
    await client.getVideo('v1');
    await client.addFavorite({ video_id: 'v1', start_ms: 0, end_ms: 1000, text: 'hi' });
    expect(calls[0].request.headers.get('X-CSRF-Token')).toBeNull();
    expect(calls[1].request.headers.get('X-CSRF-Token')).toBe('token-1');
    expect(JSON.parse(calls[1].body)).toEqual({
      video_id: 'v1',
      start_ms: 0,
      end_ms: 1000,
      text: 'hi',
    });
    expect(calls[1].request.credentials).toBe('include');
  });

  it('keeps CSRF state per client', () => {
    const first = createRekolektClient({ baseUrl: 'http://a.test/api' });
    const second = createRekolektClient({ baseUrl: 'http://b.test/api' });
    first.setCsrfToken('a');
    expect(second.getCsrfToken()).toBeNull();
  });

  it('serializes episode-library filters with repeated people and tags', async () => {
    const { client, calls } = createTestClient({
      '/videos': { items: [], page_info: { has_next_page: false, has_previous_page: false } },
    });
    await client.listStreamLibrary({
      limit: 5,
      people: ['a', 'b'],
      tags: ['t'],
      completed_only: true,
    });
    expect(calls[0].url.searchParams.getAll('people')).toEqual(['a', 'b']);
    expect(calls[0].url.searchParams.get('completed_only')).toBe('true');
    expect(calls[0].url.searchParams.get('limit')).toBe('5');
  });

  it('requests the formatted transcript for a source', async () => {
    const { client, calls } = createTestClient({ '/videos/v1/transcript': { segments: [] } });
    await client.getTranscript('v1', 'whisper');
    expect(Object.fromEntries(calls[0].url.searchParams)).toEqual({
      mode: 'formatted',
      source: 'whisper',
    });
  });

  it('normalizes the timeline and legacy array responses', async () => {
    const { client } = createTestClient({
      '/archive/timeline': { buckets: [{ period: '2026-01' }] },
    });
    await expect(client.getTimeline()).resolves.toEqual([{ period: '2026-01' }]);
    expect(normalizeVideosResponse([{ id: '1', youtube_id: 'y' }]).page_info.total_count).toBe(1);
  });

  it('builds API and OAuth URLs under the base', () => {
    const client = createRekolektClient({ baseUrl: 'https://archive.example/api/' });
    expect(client.loginUrl('twitch')).toBe('https://archive.example/api/auth/login/twitch');
    expect(client.url('share', { a: 1, b: null })).toBe('https://archive.example/api/share?a=1');
    expect(buildApiUrl('', undefined, '')).toBe('/');
    expect(buildApiUrl('/x/', new URLSearchParams('q=1'))).toBe('/api/x/?q=1');
  });

  it('rejects HTTP errors', async () => {
    const { client } = createTestClient({});
    await expect(client.getVideo('missing')).rejects.toThrow(/404/);
  });
});
