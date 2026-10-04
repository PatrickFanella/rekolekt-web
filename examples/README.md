# Example

A small, unpublished app that renders the kit's default components against a
running Rekolekt API. It is a demonstration, not a reference design.

- `index.html` uses the optional neutral stylesheet, `@subcult/rekolekt-web/base.css`.
- `custom.html` uses only `custom.css`, plain CSS written against the
  components' `data-rk`, `data-part` and state attributes.

Both pages render the same `App.tsx`.

```sh
npm install
REKOLEKT_API_URL=http://localhost:8000 npm run example
# open http://localhost:5173/ and http://localhost:5173/custom.html
```

Vite proxies `/api` to `REKOLEKT_API_URL` and strips the prefix, the same way a
production reverse proxy mounts the API under `/api`.
