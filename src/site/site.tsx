import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRekolektClient } from '../provider/context';
import type { RekolektClient } from '../client/client';
import { defaultSiteConfig, resolveSiteConfig, type SiteConfig } from './siteConfig';

export type SiteStatus = 'loading' | 'ready' | 'fallback';
export type SiteState = SiteConfig & { status: SiteStatus };

const SiteContext = createContext<SiteState>({ ...defaultSiteConfig, status: 'loading' });

/**
 * Fetch and validate `/site`. Resolves to the defaults (merged with `fallback`)
 * when the document is missing or not schema version 1.
 */
export async function loadSiteConfig(
  client: RekolektClient,
  { fallback = defaultSiteConfig, signal }: { fallback?: SiteConfig; signal?: AbortSignal } = {}
): Promise<{ site: SiteConfig; valid: boolean }> {
  const response: unknown = await client.getSite(signal);
  const site = resolveSiteConfig(response, fallback);
  return { site, valid: site !== fallback };
}

export function SiteProvider({
  children,
  initialSite,
}: {
  children: ReactNode;
  initialSite?: SiteConfig;
}) {
  const client = useRekolektClient();
  const [state, setState] = useState<SiteState>(() => ({
    ...(initialSite ?? defaultSiteConfig),
    status: 'loading',
  }));
  useEffect(() => {
    const controller = new AbortController();
    const fallback = initialSite ?? defaultSiteConfig;
    loadSiteConfig(client, { fallback, signal: controller.signal })
      .then(({ site, valid }) => {
        if (!controller.signal.aborted) setState({ ...site, status: valid ? 'ready' : 'fallback' });
      })
      .catch(() => {
        // Keep the current values when configuration cannot be fetched; opt-in
        // features such as community stay off.
        if (!controller.signal.aborted) setState((current) => ({ ...current, status: 'fallback' }));
      });
    return () => controller.abort();
  }, [client, initialSite]);
  return <SiteContext.Provider value={state}>{children}</SiteContext.Provider>;
}

/** The archive's public configuration, with a `status` of loading, ready or fallback. */
export function useSite() {
  return useContext(SiteContext);
}
