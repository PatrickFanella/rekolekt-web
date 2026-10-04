import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useSite } from '../site/site';
import { defaultSiteConfig, isSiteConfig, resolveSiteConfig } from '../site/siteConfig';
import { renderWithKit } from './test-utils';

function Consumer() {
  const site = useSite();
  return (
    <p data-status={site.status}>
      {site.name} · {site.creator_name}
    </p>
  );
}

describe('site configuration', () => {
  it('loads the configured site and creator instead of a fixed archive brand', async () => {
    renderWithKit(<Consumer />, {
      routes: {
        '/site': {
          name: 'Creator library',
          creator_name: 'Demo creator',
          description: 'A catalog',
          community_enabled: false,
          public_passages_enabled: false,
        },
      },
    });
    expect(await screen.findByText('Creator library · Demo creator')).toHaveAttribute(
      'data-status',
      'ready'
    );
  });

  it('keeps the defaults when /site is unavailable or a newer schema', async () => {
    renderWithKit(<Consumer />, { routes: { '/site': { schema_version: 2, name: 'Future' } } });
    await waitFor(() =>
      expect(
        screen.getByText(`${defaultSiteConfig.name} · ${defaultSiteConfig.creator_name}`)
      ).toHaveAttribute('data-status', 'fallback')
    );
  });

  it('shows the defaults outside a provider', () => {
    render(<Consumer />);
    expect(screen.getByText(/Transcript Archive/)).toHaveAttribute('data-status', 'loading');
  });

  it('validates documents and keeps deprecated theme fields', () => {
    expect(isSiteConfig({ name: 'x' })).toBe(false);
    const site = resolveSiteConfig({
      ...defaultSiteConfig,
      name: 'Themed',
      theme: { font: 'mono', dark: { canvas: '#000000' } },
    });
    expect(site.name).toBe('Themed');
    expect(site.theme?.font).toBe('mono');
  });
});
