# @subcult/rekolekt-web

Headless frontend kit for [Rekolekt](https://git.subcult.tv/subculture-collective/rekolekt) archives.

Rekolekt core is a backend and API only. Each archive builds and owns its whole
frontend: routes, pages, layout, design system, fonts and brand assets. This
package supplies what an archive frontend would otherwise rewrite:

- a typed API client and types generated from Rekolekt's OpenAPI document;
- the site configuration loader and session handling;
- React hooks for search, episodes, transcripts, topics, favorites and saved searches;
- player and transcript behaviour: timestamp sync, passage selection, copy-link and quote formatting;
- default components built on those hooks, with no colours, fonts or images of their own;
- crawler metadata and social-preview helpers.

It ships no pages and no visual design. The Rekolekt-designed app that used to
live in core, including its Playwright suite, is kept unchanged on the branch
[`archive/reference-app-ae1cc82`](https://git.subcult.tv/subculture-collective/rekolekt-web/src/branch/archive/reference-app-ae1cc82)
for reference. It is not maintained or published.

## Install

The package is published to the SUBCULT Gitea npm registry. Add the scope to
your project's `.npmrc` (use a token with `read:package` if the registry asks for one):

```ini
@subcult:registry=https://git.subcult.tv/api/packages/subculture-collective/npm/
```

```sh
npm install @subcult/rekolekt-web @tanstack/react-query react react-dom
```

React 19 and TanStack Query 5 are peer dependencies. `@atproto/oauth-client-browser`
is an optional peer, needed only for `@subcult/rekolekt-web/atproto`.

## Point it at an API

Rekolekt serves its routes at the root of the API service (`/site`, `/search`,
`/videos`, `/health`, …). Frontends usually mount it under `/api` on their own
origin with a reverse proxy, which keeps session cookies first-party:

```nginx
location /api/ { proxy_pass http://rekolekt-api:8000/; }
```

Then give the provider that base URL. The default is `/api`.

```tsx
<RekolektProvider baseUrl="/api">{app}</RekolektProvider>
```

A cross-origin API also works if the API's `FRONTEND_ORIGIN`/CORS settings list
your origin; requests are sent with credentials.

Rekolekt's share redirects and exports link to `/v/:videoId?t=<seconds>`.
Serve an episode view at that path, or keep `links.episode` compatible with it.

## A minimal page

```tsx
import { useState } from 'react';
import {
  RekolektProvider,
  SearchForm,
  SearchResults,
  useArchiveSearch,
  useFavorites,
} from '@subcult/rekolekt-web';
import '@subcult/rekolekt-web/base.css'; // optional

function Search() {
  const [query, setQuery] = useState('');
  const search = useArchiveSearch({ q: query });
  const favorites = useFavorites();
  return (
    <main>
      <SearchForm onSearch={setQuery} />
      {search.enabled && (
        <SearchResults
          query={query}
          results={search.results}
          loading={search.loading}
          loadingMore={search.loadingMore}
          canLoadMore={search.canLoadMore}
          onLoadMore={search.loadMore}
          error={search.error}
          onRetry={search.retry}
          isSaved={(videoId, m) =>
            favorites.isSaved({ videoId, startMs: m.start_ms, endMs: m.end_ms })
          }
          onSave={(group, m) =>
            favorites.toggle({
              videoId: group.video.id,
              startMs: m.start_ms,
              endMs: m.end_ms,
              text: m.snippet,
            })
          }
        />
      )}
    </main>
  );
}

export function App() {
  return (
    <RekolektProvider baseUrl="/api">
      <Search />
    </RekolektProvider>
  );
}
```

`examples/` contains a slightly larger app (search, episode list, player,
transcript, passage editor, saved moments, sign-in) rendered with the base
stylesheet on one page and with plain custom CSS on the other. It is not published.

## Provider

`RekolektProvider` sets up the API client, a TanStack Query client, `/site`,
the session and the strings. Options:

| Prop                  | Purpose                                                  |
| --------------------- | -------------------------------------------------------- |
| `baseUrl` or `client` | API location, or a client from `createRekolektClient`    |
| `queryClient`         | share your app's QueryClient                             |
| `linkComponent`       | your router's link; receives `href`                      |
| `links`               | override `episode`, `search` and `topic` URLs            |
| `strings`             | replace any user-visible wording                         |
| `initialSite`         | site values to show before `/site` responds              |
| `auth={false}`        | skip the session request on public, signed-out frontends |
| `analytics`           | event batching from `createAnalytics(client)`            |

React Router example:

```tsx
const Link = forwardRef<HTMLAnchorElement, LinkProps>(({ href, ...props }, ref) => (
  <RouterLink ref={ref} to={href} {...props} />
));
<RekolektProvider linkComponent={Link}>…</RekolektProvider>;
```

## Hooks

| Area                | Hooks and helpers                                                                                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Site and session    | `useSite`, `loadSiteConfig`, `useAuth` (status, user, role, capabilities, `loginWith`, `logout`)                                                                      |
| Search              | `useArchiveSearch`, `useSearchSuggestions`, `readFilters`/`serializeFilters`, `clusterNearbyMoments`, `bucketMomentsByDate`                                           |
| Episodes            | `useEpisodes` (cursor or offset paging), `useRecentEpisodes`, `useEpisode`, `useEpisodeChapters`, `useEpisodeIntelligence`, `useArchiveSummary`, `useArchiveTimeline` |
| Transcripts         | `useTranscript`, `buildTranscriptTurns`, `findEpisodeTopics`, `buildProgressiveTranscriptChapters`                                                                    |
| Topics              | `useArchiveIntelligence`, `useTopicTimeline`, `useTopicOpinions`                                                                                                      |
| Player              | `useYouTubePlayer`, `usePlaybackTime`, `useActiveSegmentIndex`                                                                                                        |
| Passages and quotes | `usePassageSelection`, `useMomentActions`, `formatQuote`, `buildPassageShareLink`, `useCopy`                                                                          |
| Saved items         | `useFavorites`, `useSavedSearches` (API when signed in, localStorage otherwise)                                                                                       |
| Other               | `createAnalytics`, `createCommunityApi`, `@subcult/rekolekt-web/atproto`                                                                                              |

Every request is also available on the client (`useRekolektClient()`), and
`ApiPaths`/`ApiComponents` expose the generated OpenAPI types for endpoints the
client does not wrap.

## Default components

`SearchForm`, `SearchResults`, `SearchMoments`, `MomentActions`,
`HighlightedSnippet`, `EpisodeList`, `EpisodeCard`, `Player`, `Transcript`,
`SegmentActions`, `PassageEditor`, `TopicList`, `SavedMomentsList`,
`SavedSearchesList`, `SignInOptions`, `SignOutButton`, `LoadingState`,
`EmptyState`, `ErrorState`, `Notice`, `TranscriptNotice` and `SiteNotice`.

Each one is optional. Use the hooks directly when a component does not fit.

## Styling contract

The components carry behaviour and accessibility, not design.

1. **No built-in look.** No colours, fonts, spacing or images ship inside a
   component. The only inline style hides the search label visually while
   keeping it for screen readers; `showLabel` turns it off.
2. **Classes.** Every component accepts `className` for its root and
   `classNames` for its parts, e.g.
   `<SearchForm classNames={{ input: 'field', submit: 'button' }} />`.
   Refs are forwarded to the root element; `Player`'s ref receives its controls.
3. **Attributes to select on.** Roots carry `data-rk="<component>"` and parts carry
   `data-part="<part>"`, so plain CSS needs no class names:
   `[data-rk='transcript'] [data-part='segment'] { … }`.
4. **State as data attributes.** Present means true:
   - `data-current`, `data-played`, `data-selected`, `data-saved` and `data-match` on transcript segments;
   - `data-playing` and `data-status` (`loading`, `ready`, `error`) on the player;
   - `data-loading` on lists, results and load-more buttons;
   - `data-selected` on topic items, `data-saved` on save actions;
   - `data-status` (`ready`, `processing`, `attention`, `unknown`) on episode cards;
   - `data-invalid` and `data-busy` on the passage editor;
   - `data-storage` (`server` or `local`) on saved moments, `data-kind` on notices and labels.
5. **Replace markup.** Render props replace a part: `renderMoment`,
   `renderGroupHeader`, `renderEpisode`, `renderItem`, `renderSegmentActions`,
   `renderOverlay`, `renderExtraActions`. `LoadingState`, `EmptyState` and
   `Notice` accept `asChild` to render your element with their role and attributes.
6. **Accessibility is kept.** Semantic elements, labels, `aria-pressed`,
   `aria-expanded`, `aria-current="time"`, live regions for copy and save
   results, and keyboard-operable controls are part of the defaults. The tests run
   axe on every component.
7. **Optional base stylesheet.** `import '@subcult/rekolekt-web/base.css'` adds a
   neutral layout using `:where()` (zero specificity) and custom properties such
   as `--rk-accent`, `--rk-border`, `--rk-highlight`, `--rk-radius` and
   `--rk-space`. Nothing requires it.

## Wording

All visible strings come from `defaultStrings`. Override them for the whole
tree with `<RekolektProvider strings={{ searchPlaceholder: 'Search the shows' }}>`
or for one component with its `strings` prop. Some entries are functions, for
example `searchResultsSummary(moments, episodes)`.

## Site metadata and social previews

```sh
npx rekolekt-web-metadata --root dist --origin https://archive.example --api https://archive.example/api
```

The command writes `<title>`, description, Open Graph and Twitter tags between
`<!-- site-metadata:start -->` and `<!-- site-metadata:end -->` in
`dist/index.html`. An SVG `social_image_url` inside `--root` is rendered to a
1200×630 `social-preview.png` with `rsvg-convert`. Use `--site site.json`
instead of `--api` to work offline. The pure functions are exported from
`@subcult/rekolekt-web/metadata`.

## API fields and deprecations

The kit types `/site` as `SiteConfig`. The `theme` object (`theme.font`,
`theme.dark`, `theme.light`) is deprecated in Rekolekt: it is still served so
existing frontends keep working, but the kit does not apply it. Style your
frontend yourself.

## The API contract

`openapi/openapi.json` is a copy of core's `docs/api/openapi.json` at the
revision in `openapi/core-revision.txt`; `src/types/generated/api.ts` is
generated from it.

```sh
REKOLEKT_CORE_DIR=../rekolekt npm run api:fetch -- <core-sha>   # or REKOLEKT_CORE_TOKEN=…
npm run api:generate
npm run api:check
```

`api:check` fails if the types drift from the document, or if the document
differs from the pinned core revision.

## Development

```sh
npm ci
npm run lint && npm run format:check && npm run type-check
npm run test:coverage
npm run build && npm run pack:check
REKOLEKT_CORE_DIR=../rekolekt integration/run.sh   # real API at the pinned revision (Docker)
```

`integration/run.sh` builds core's API image from the checkout, applies
migrations, seeds one episode (`integration/seed.sql`), and runs
`tests/integration` against it.

## Releasing

Bump `version` in `package.json`, add a `CHANGELOG.md` entry, merge, then push a
`v<version>` tag. The release workflow verifies the tag matches the package
version, runs the checks and publishes to the Gitea npm registry.

## License

Apache-2.0
