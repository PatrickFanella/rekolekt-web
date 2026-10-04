import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { vi } from 'vitest';
import { createRekolektClient } from '../client/client';
import {
  RekolektProvider,
  createQueryClient,
  type RekolektProviderProps,
} from '../provider/RekolektProvider';

export type MockRoute =
  unknown | ((request: Request, url: URL) => unknown | Response | Promise<unknown>);

/**
 * A fetch double for the Rekolekt client. Keys are `METHOD /path` or `/path`
 * (GET), relative to the API base. Unknown routes return 404.
 */
export function mockFetch(routes: Record<string, MockRoute>) {
  const calls: Array<{ method: string; path: string; url: URL; request: Request; body: string }> =
    [];
  const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init);
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/api/, '');
    const body = request.method === 'GET' ? '' : await request.clone().text();
    calls.push({ method: request.method, path, url, request, body });
    const route =
      routes[`${request.method} ${path}`] ?? (request.method === 'GET' ? routes[path] : undefined);
    if (route === undefined) return new Response('{"detail":"not found"}', { status: 404 });
    const result = typeof route === 'function' ? await route(request, url) : route;
    if (result instanceof Response) return result;
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  });
  return { fetch: fetchImpl as unknown as typeof fetch, calls };
}

export const siteFixture = {
  schema_version: 1,
  name: 'Test archive',
  description: 'A test archive',
  creator_name: 'Tester',
  public_passages_enabled: true,
  community_enabled: false,
};

export function createTestClient(routes: Record<string, MockRoute> = {}) {
  const mock = mockFetch({ '/site': siteFixture, '/auth/me': { user: null }, ...routes });
  const client = createRekolektClient({ baseUrl: 'http://archive.test/api', fetch: mock.fetch });
  return { client, ...mock };
}

/** Render inside a RekolektProvider whose client answers from `routes`. */
export function renderWithKit(
  ui: ReactElement,
  {
    routes = {},
    provider = {},
    ...options
  }: Omit<RenderOptions, 'wrapper'> & {
    routes?: Record<string, MockRoute>;
    provider?: Partial<RekolektProviderProps>;
  } = {}
) {
  const test = createTestClient(routes);
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({ queries: { retry: false } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <RekolektProvider client={test.client} queryClient={queryClient} {...provider}>
      {children}
    </RekolektProvider>
  );
  return { ...render(ui, { wrapper: Wrapper, ...options }), ...test, queryClient, Wrapper };
}
