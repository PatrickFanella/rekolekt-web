// Copy Rekolekt's committed OpenAPI document at the pinned core revision into
// openapi/openapi.json.
//
//   REKOLEKT_CORE_DIR=../rekolekt node scripts/fetch-openapi.mjs [<sha>]
//   REKOLEKT_CORE_TOKEN=... node scripts/fetch-openapi.mjs [<sha>]
//
// With a SHA argument the pin in openapi/core-revision.txt is updated first.
// A local core clone (REKOLEKT_CORE_DIR) is read with `git show`; otherwise the
// file is downloaded from Gitea, with a token if the instance requires sign-in.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const CORE =
  process.env.REKOLEKT_CORE_URL ?? 'https://git.subcult.tv/subculture-collective/rekolekt';
const pinFile = new URL('../openapi/core-revision.txt', import.meta.url);

export function pinnedRevision() {
  return readFileSync(pinFile, 'utf8').trim();
}

export async function fetchSpec(sha = pinnedRevision()) {
  const dir = process.env.REKOLEKT_CORE_DIR;
  if (dir) {
    return execFileSync('git', ['-C', dir, 'show', `${sha}:docs/api/openapi.json`], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
  }
  const token = process.env.REKOLEKT_CORE_TOKEN;
  const response = await fetch(`${CORE}/raw/commit/${sha}/docs/api/openapi.json`, {
    headers: token ? { Authorization: `token ${token}` } : {},
    redirect: 'manual',
  });
  if (response.status !== 200)
    throw new Error(
      `Fetching the core OpenAPI document failed (${response.status}); set REKOLEKT_CORE_DIR or REKOLEKT_CORE_TOKEN.`
    );
  return response.text();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const requested = process.argv[2];
  if (requested) {
    if (!/^[0-9a-f]{40}$/.test(requested)) throw new Error('Pass a full 40-character commit SHA');
    writeFileSync(pinFile, `${requested}\n`);
  }
  const spec = await fetchSpec();
  JSON.parse(spec);
  writeFileSync(new URL('../openapi/openapi.json', import.meta.url), spec);
  console.log(
    `openapi/openapi.json updated from core ${pinnedRevision()}; run npm run api:generate.`
  );
}
