import { createContext, useContext } from 'react';
import type { RekolektClient } from '../client/client';
import type { ArchiveLinks } from '../format/links';
import type { LinkComponent } from '../components/primitives';
import type { Analytics } from '../analytics/analytics';

export type RekolektContextValue = {
  client: RekolektClient;
  links: ArchiveLinks;
  /** Element used for internal navigation, e.g. a router's `Link`. Defaults to `<a>`. */
  Link: LinkComponent;
  /** Optional event batching; hooks report searches, seeks and saves to it. */
  analytics: Analytics | null;
};

export const RekolektContext = createContext<RekolektContextValue | null>(null);

export function useRekolekt(): RekolektContextValue {
  const context = useContext(RekolektContext);
  if (!context) throw new Error('Wrap the component in <RekolektProvider>.');
  return context;
}

/** The API client from the nearest provider. */
export function useRekolektClient() {
  return useRekolekt().client;
}
