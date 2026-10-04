/**
 * Integration tests against a real Rekolekt API (see integration/run.sh).
 * The API is seeded with one episode, `integration/seed.sql`.
 */
import '@testing-library/jest-dom/vitest';
import { readFileSync } from 'node:fs';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import {
  RekolektProvider,
  SearchResults,
  Transcript,
  createQueryClient,
  createRekolektClient,
  useArchiveSearch,
  useAuth,
  useEpisodes,
  useSite,
  useTranscript,
} from '../../src';

const API = process.env.REKOLEKT_API_URL;
if (!API)
  throw new Error('Set REKOLEKT_API_URL; run integration/run.sh to start a disposable API.');
const VIDEO_ID = '00000000-0000-0000-0000-000000000201';

const client = createRekolektClient({ baseUrl: API });

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({ queries: { retry: false } });
  return (
    <RekolektProvider baseUrl={API} queryClient={queryClient}>
      {children}
    </RekolektProvider>
  );
}

describe('Rekolekt API contract', () => {
  it('serves the committed OpenAPI document for the pinned core revision', async () => {
    const live = await client.http.get('openapi.json').json<Record<string, unknown>>();
    const committed = JSON.parse(readFileSync('openapi/openapi.json', 'utf8'));
    expect(live).toEqual(committed);
  });

  it('reports health', async () => {
    const health = await client.getHealth();
    expect(health).toEqual(expect.objectContaining({ status: expect.any(String) }));
  });

  it('serves /site with deprecated theme fields still present', async () => {
    const site = await client.getSite();
    expect(site).toEqual(
      expect.objectContaining({
        schema_version: 1,
        name: 'Integration archive',
        creator_name: 'Integration creator',
        public_passages_enabled: expect.any(Boolean),
        community_enabled: expect.any(Boolean),
      })
    );
    expect(site).toHaveProperty('theme');
  });

  it('lists, reads and transcribes the seeded episode', async () => {
    const library = await client.listStreamLibrary({ limit: 5 });
    expect(library.items.map((item) => item.id)).toContain(VIDEO_ID);
    const video = await client.getVideo(VIDEO_ID);
    expect(video.title).toBe('Seeded integration episode');
    const transcript = await client.getTranscript(VIDEO_ID);
    expect(transcript.segments.map((segment) => segment.text)).toContain(
      'Rent control is a policy question.'
    );
  });

  it('finds the seeded moments in grouped search', async () => {
    const results = await client.searchGrouped('rent', { limit: 10 });
    const group = results.groups.find((item) => item.video.id === VIDEO_ID);
    expect(group?.moments.length).toBeGreaterThan(0);
  });

  it('answers the anonymous session and refuses unauthenticated favorites', async () => {
    await expect(client.getSession()).resolves.toEqual(expect.objectContaining({ user: null }));
    await expect(client.listFavorites()).rejects.toThrow(/401|403/);
  });
});

describe('hooks and components against the API', () => {
  it('loads the site and an anonymous session', async () => {
    const { result } = renderHook(() => ({ site: useSite(), auth: useAuth() }), { wrapper });
    await waitFor(() => expect(result.current.site.status).toBe('ready'));
    expect(result.current.site.name).toBe('Integration archive');
    await waitFor(() => expect(result.current.auth.status).toBe('anonymous'));
  });

  it('pages the episode library', async () => {
    const { result } = renderHook(() => useEpisodes({ limit: 5 }), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.episodes.some((episode) => episode.id === VIDEO_ID)).toBe(true);
  });

  it('renders search results from useArchiveSearch', async () => {
    function Search() {
      const search = useArchiveSearch({ q: 'rent' });
      return (
        <SearchResults
          query="rent"
          results={search.results}
          loading={search.loading}
          error={search.error}
          onRetry={search.retry}
        />
      );
    }
    render(<Search />, { wrapper });
    expect(
      await screen.findByRole('heading', { name: 'Seeded integration episode' })
    ).toBeInTheDocument();
    expect(screen.getAllByRole('group', { name: 'Moment actions' }).length).toBeGreaterThan(0);
  });

  it('renders the transcript from useTranscript', async () => {
    function Reader() {
      const transcript = useTranscript(VIDEO_ID);
      if (!transcript.data) return <p>loading</p>;
      return (
        <Transcript
          videoId={VIDEO_ID}
          title="Seeded"
          segments={transcript.data.segments}
          currentMs={11_000}
        />
      );
    }
    render(<Reader />, { wrapper });
    const current = await screen.findByRole('button', { name: /Open Guest at 00:00:10/ });
    expect(current).toHaveAttribute('data-current');
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(2);
  });
});
