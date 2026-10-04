import { describe, expect, it } from 'vitest';
import { buildSiteMetadataTags, injectSiteMetadata, normalizeOrigin } from '../metadata/metadata';

const html = `<head>
    <!-- site-metadata:start -->
    <title>Old</title>
    <!-- site-metadata:end -->
</head>`;

describe('site metadata', () => {
  it('renders escaped Open Graph and Twitter tags with an absolute image', () => {
    const tags = buildSiteMetadataTags(
      { name: 'A & B <archive>', description: '"Quoted" text' },
      {
        origin: 'https://archive.example',
        image: { url: '/social-preview.png', type: 'image/png', width: 1200, height: 630 },
      }
    );
    expect(tags[0]).toBe('<title>A &amp; B &lt;archive&gt;</title>');
    expect(tags).toContain(
      '<meta property="og:image" content="https://archive.example/social-preview.png" />'
    );
    expect(tags).toContain('<meta property="og:image:width" content="1200" />');
    expect(tags).toContain('<meta name="twitter:card" content="summary_large_image" />');
    expect(tags).toContain('<meta name="description" content="&quot;Quoted&quot; text" />');
  });

  it('falls back to a summary card without an image', () => {
    const tags = buildSiteMetadataTags(
      { name: 'A', description: 'B' },
      { origin: 'http://localhost' }
    );
    expect(tags).toContain('<meta name="twitter:card" content="summary" />');
    expect(tags.some((tag) => tag.includes('og:image'))).toBe(false);
  });

  it('replaces exactly one metadata block', () => {
    const result = injectSiteMetadata(html, ['<title>New</title>']);
    expect(result).toContain('<title>New</title>');
    expect(result).not.toContain('Old');
    expect(() => injectSiteMetadata('<head></head>', [])).toThrow(/exactly one/);
    expect(() => injectSiteMetadata(html + html, [])).toThrow(/exactly one/);
  });

  it.each([
    'ftp://x',
    'https://a.example/path',
    'https://user:pw@a.example',
    'https://a.example?x',
    'nope',
  ])('rejects origin %s', (origin) => {
    expect(() => normalizeOrigin(origin)).toThrow();
  });

  it('rejects non-HTTP image URLs', () => {
    expect(() =>
      buildSiteMetadataTags(
        { name: 'A', description: 'B' },
        { origin: 'https://a.example', image: 'javascript:alert(1)' }
      )
    ).toThrow(/HTTP/);
  });
});
