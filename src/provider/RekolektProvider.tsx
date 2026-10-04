import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMemo, useState, type ReactNode } from 'react';
import { createRekolektClient, type RekolektClient } from '../client/client';
import { AuthProvider } from '../auth/auth';
import { SiteProvider } from '../site/site';
import type { SiteConfig } from '../site/siteConfig';
import { StringsProvider, type RekolektStrings } from '../strings/strings';
import { createArchiveLinks, type ArchiveLinks } from '../format/links';
import { DefaultLink, type LinkComponent } from '../components/primitives';
import { RekolektContext } from './context';
import type { Analytics } from '../analytics/analytics';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: (failureCount, error) =>
          !(error instanceof DOMException && error.name === 'AbortError') && failureCount < 2,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  });
}

export type RekolektProviderProps = {
  children: ReactNode;
  /** An existing client. Takes precedence over `baseUrl`. */
  client?: RekolektClient;
  /** API base URL used to create a client when `client` is not given. Defaults to `/api`. */
  baseUrl?: string;
  /** Share a TanStack Query client with the rest of the app. One is created otherwise. */
  queryClient?: QueryClient;
  /** Override where episode, search and topic links point. */
  links?: Partial<ArchiveLinks>;
  /** Router link component, e.g. React Router's `Link` (receives `href`). */
  linkComponent?: LinkComponent;
  /** Replace any user-visible default wording. */
  strings?: Partial<RekolektStrings>;
  /** Site values to show before `/site` responds (e.g. server-rendered). */
  initialSite?: SiteConfig;
  /** Set false to skip the session request (public, signed-out frontends). */
  auth?: boolean;
  /** Event batching from `createAnalytics(client)`. Off unless given. */
  analytics?: Analytics;
};

/** Supplies the API client, query cache, site configuration, session and strings. */
export function RekolektProvider({
  children,
  client: providedClient,
  baseUrl,
  queryClient: providedQueryClient,
  links,
  linkComponent,
  strings,
  initialSite,
  auth = true,
  analytics,
}: RekolektProviderProps) {
  const [ownClient] = useState(() => providedClient ?? createRekolektClient({ baseUrl }));
  const [ownQueryClient] = useState(() => providedQueryClient ?? createQueryClient());
  const client = providedClient ?? ownClient;
  const queryClient = providedQueryClient ?? ownQueryClient;
  const value = useMemo(
    () => ({
      client,
      links: createArchiveLinks(links),
      Link: linkComponent ?? DefaultLink,
      analytics: analytics ?? null,
    }),
    [client, links, linkComponent, analytics]
  );
  const content = auth ? <AuthProvider>{children}</AuthProvider> : children;
  return (
    <RekolektContext.Provider value={value}>
      <QueryClientProvider client={queryClient}>
        <StringsProvider strings={strings}>
          <SiteProvider initialSite={initialSite}>{content}</SiteProvider>
        </StringsProvider>
      </QueryClientProvider>
    </RekolektContext.Provider>
  );
}
