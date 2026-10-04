# Changelog

## 0.1.0

First release of the headless kit, extracted from the frontend that lived in
Rekolekt core until core `ae1cc82`. History for the moved files is preserved.

- Typed API client (`createRekolektClient`) with per-client CSRF handling, and
  OpenAPI types generated from a pinned core revision.
- Provider for the client, query cache, `/site`, session, links and strings.
- Hooks for search, episodes, transcripts, topics, favorites, saved searches,
  playback sync, passage selection and copying quotes and links.
- Default components with no built-in design: class names per part,
  `data-rk`/`data-part` and state attributes, render props, forwarded refs,
  replaceable strings, and an optional neutral `base.css`.
- `rekolekt-web-metadata` CLI and `@subcult/rekolekt-web/metadata` for crawler
  tags and SVG social previews (replaces `render-site-metadata.py`).
- Search requests now send `match_mode`, which the old frontend dropped.
- The designed reference app and its Playwright suite remain on
  `archive/reference-app-ae1cc82`; they are not part of this package.
