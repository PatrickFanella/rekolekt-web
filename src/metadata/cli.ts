/**
 * rekolekt-web-metadata: write crawler metadata into a built `index.html`.
 *
 *   rekolekt-web-metadata --root dist --origin https://archive.example \
 *     [--site site.json | --api https://archive.example/api]
 *
 * An SVG social image under `--root` is rendered to a 1200x630
 * `social-preview.png` with `rsvg-convert` (librsvg), because most crawlers
 * ignore SVG previews. The original artwork is never modified.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, renameSync, writeFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { buildSiteMetadataTags, injectSiteMetadata, type SocialImage } from './metadata';
import { defaultSiteConfig, resolveSiteConfig } from '../site/siteConfig';

function argument(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function loadSite() {
  const file = argument('site');
  if (file) return resolveSiteConfig(JSON.parse(readFileSync(file, 'utf8')));
  const api = argument('api');
  if (api) {
    const response = await fetch(new URL('site', api.endsWith('/') ? api : `${api}/`));
    if (!response.ok) throw new Error(`GET /site returned ${response.status}`);
    return resolveSiteConfig(await response.json());
  }
  return defaultSiteConfig;
}

export function renderSocialImage(root: string, imagePath: string): SocialImage {
  const resolvedRoot = path.resolve(root);
  const source = path.resolve(resolvedRoot, imagePath.replace(/^\/+/, ''));
  if (
    !source.startsWith(`${resolvedRoot}${path.sep}`) ||
    !existsSync(source) ||
    !statSync(source).isFile()
  )
    throw new Error('An SVG social image must exist inside --root');
  const temporary = path.join(resolvedRoot, 'social-preview.tmp.png');
  execFileSync('rsvg-convert', [
    '--width',
    '1200',
    '--height',
    '630',
    '--output',
    temporary,
    source,
  ]);
  renameSync(temporary, path.join(resolvedRoot, 'social-preview.png'));
  return { url: '/social-preview.png', type: 'image/png', width: 1200, height: 630 };
}

async function main() {
  const root = argument('root') ?? 'dist';
  const origin = argument('origin');
  if (!origin) throw new Error('--origin is required, e.g. --origin https://archive.example');
  const site = await loadSite();
  let image: SocialImage | undefined;
  const imageUrl = site.social_image_url;
  if (imageUrl) {
    const isSvg = new URL(imageUrl, 'http://local.invalid').pathname.toLowerCase().endsWith('.svg');
    if (isSvg) {
      if (!imageUrl.startsWith('/') || imageUrl.startsWith('//'))
        throw new Error('SVG social images must be local; use a PNG or JPEG for remote images');
      image = renderSocialImage(root, new URL(imageUrl, 'http://local.invalid').pathname);
    } else {
      image = { url: imageUrl };
    }
  }
  const index = path.join(root, 'index.html');
  const html = injectSiteMetadata(
    readFileSync(index, 'utf8'),
    buildSiteMetadataTags(site, { origin, image })
  );
  const temporary = `${index}.tmp`;
  writeFileSync(temporary, html);
  renameSync(temporary, index);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
