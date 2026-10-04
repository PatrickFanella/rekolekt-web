/**
 * Public archive configuration served by `GET /site`.
 *
 * Archives own their visual design. The `theme` object is still served by
 * Rekolekt for frontends written before the headless split, but it is
 * deprecated: new frontends should style themselves and ignore it.
 */
export type SiteConfig = {
  schema_version?: 1;
  name: string;
  description: string;
  creator_name: string;
  tagline?: string;
  operator_name?: string;
  operator_url?: string;
  project_notice?: string;
  logo_url?: string;
  favicon_url?: string;
  social_image_url?: string;
  /** @deprecated Visual tokens; each archive's frontend owns its styling. */
  theme?: {
    /** @deprecated */
    font?: 'system' | 'editorial' | 'mono' | null;
    /** @deprecated */
    dark?: Record<string, string>;
    /** @deprecated */
    light?: Record<string, string>;
  };
  public_passages_enabled: boolean;
  clip_exports_enabled?: boolean;
  atproto_enabled?: boolean;
  community_enabled: boolean;
};

/** Neutral values used until `/site` responds, or if it cannot be read. */
export const defaultSiteConfig: SiteConfig = {
  schema_version: 1,
  name: 'Transcript Archive',
  description:
    'A searchable archive of timestamped transcripts, with each passage linked to its source recording.',
  creator_name: 'the creators',
  tagline: 'Broadcast archive',
  operator_name: 'Archive team',
  operator_url: '',
  project_notice: 'Source recordings and trademarks belong to their respective owners.',
  public_passages_enabled: true,
  community_enabled: false,
};

/** Accept only the schema this kit understands; reject partial or newer documents. */
export function isSiteConfig(value: unknown): value is SiteConfig {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<SiteConfig>;
  return (
    (candidate.schema_version === undefined || candidate.schema_version === 1) &&
    typeof candidate.name === 'string' &&
    typeof candidate.creator_name === 'string' &&
    typeof candidate.description === 'string' &&
    typeof candidate.public_passages_enabled === 'boolean' &&
    typeof candidate.community_enabled === 'boolean'
  );
}

/** Merge a fetched document over the defaults, or keep the defaults if it is invalid. */
export function resolveSiteConfig(value: unknown, fallback: SiteConfig = defaultSiteConfig) {
  return isSiteConfig(value) ? { ...fallback, ...value } : fallback;
}
