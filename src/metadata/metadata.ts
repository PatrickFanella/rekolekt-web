import type { SiteConfig } from '../site/siteConfig';

export const METADATA_START = '<!-- site-metadata:start -->';
export const METADATA_END = '<!-- site-metadata:end -->';

export type SiteMetadataInput = Pick<SiteConfig, 'name' | 'description'> &
  Partial<Pick<SiteConfig, 'social_image_url'>>;

export type SocialImage = {
  url: string;
  type?: string;
  width?: number;
  height?: number;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/** Validate and normalize a public origin such as `https://archive.example`. */
export function normalizeOrigin(origin: string) {
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    throw new Error('origin must be an absolute HTTP(S) origin');
  }
  if (
    !['http:', 'https:'].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    !['', '/'].includes(parsed.pathname) ||
    parsed.search ||
    parsed.hash ||
    /[?#]/.test(origin)
  )
    throw new Error('origin must be an absolute HTTP(S) origin');
  return `${parsed.protocol}//${parsed.host}/`;
}

/**
 * Crawler-visible `<title>`, description, Open Graph and Twitter tags for an
 * archive. `image` is resolved against `origin`; it must end up HTTP(S).
 */
export function buildSiteMetadataTags(
  site: SiteMetadataInput,
  { origin, image }: { origin: string; image?: SocialImage | string }
) {
  const base = normalizeOrigin(origin);
  const social: SocialImage =
    typeof image === 'string' ? { url: image } : (image ?? { url: site.social_image_url || '' });
  const tags = [
    `<title>${escapeHtml(site.name)}</title>`,
    `<meta name="description" content="${escapeHtml(site.description)}" />`,
  ];
  const entries: Array<[string, string]> = [
    ['og:type', 'website'],
    ['og:site_name', site.name],
    ['og:title', site.name],
    ['og:description', site.description],
    ['og:url', base],
  ];
  if (social.url) {
    const imageUrl = new URL(social.url, base);
    if (!['http:', 'https:'].includes(imageUrl.protocol))
      throw new Error('Social image must be an HTTP(S) URL');
    entries.push(['og:image', imageUrl.href], ['og:image:alt', site.name]);
    if (social.type) entries.push(['og:image:type', social.type]);
    if (social.width) entries.push(['og:image:width', String(social.width)]);
    if (social.height) entries.push(['og:image:height', String(social.height)]);
    entries.push(
      ['twitter:card', 'summary_large_image'],
      ['twitter:title', site.name],
      ['twitter:description', site.description],
      ['twitter:image', imageUrl.href],
      ['twitter:image:alt', site.name]
    );
  } else {
    entries.push(
      ['twitter:card', 'summary'],
      ['twitter:title', site.name],
      ['twitter:description', site.description]
    );
  }
  for (const [key, value] of entries) {
    const attribute = key.startsWith('twitter:') ? 'name' : 'property';
    tags.push(`<meta ${attribute}="${key}" content="${escapeHtml(value)}" />`);
  }
  return tags;
}

/**
 * Replace the block between `<!-- site-metadata:start -->` and
 * `<!-- site-metadata:end -->` in an HTML document. Throws unless exactly one
 * block exists.
 */
export function injectSiteMetadata(html: string, tags: string[], indent = '    ') {
  const pattern = new RegExp(
    `${METADATA_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${METADATA_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
    'g'
  );
  const matches = html.match(pattern);
  if (!matches || matches.length !== 1)
    throw new Error('Expected exactly one site metadata block in the HTML document');
  const replacement = `${METADATA_START}\n${indent}${tags.join(`\n${indent}`)}\n${indent}${METADATA_END}`;
  return html.replace(pattern, () => replacement);
}
