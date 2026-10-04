// Fail when the generated types drift from openapi/openapi.json, or when
// openapi.json differs from the pinned core revision. The second check needs
// REKOLEKT_CORE_DIR or REKOLEKT_CORE_TOKEN (see fetch-openapi.mjs); set
// OPENAPI_OFFLINE=1 to run only the first.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fetchSpec, pinnedRevision } from './fetch-openapi.mjs';

const root = new URL('..', import.meta.url).pathname;
const temp = mkdtempSync(path.join(tmpdir(), 'rekolekt-openapi-'));
try {
  const generated = path.join(temp, 'api.ts');
  execFileSync(
    path.join(root, 'node_modules/.bin/openapi-typescript'),
    [path.join(root, 'openapi/openapi.json'), '--output', generated],
    { stdio: 'ignore' }
  );
  if (
    readFileSync(generated, 'utf8') !==
    readFileSync(path.join(root, 'src/types/generated/api.ts'), 'utf8')
  ) {
    console.error(
      'src/types/generated/api.ts drifted from openapi/openapi.json; run npm run api:generate.'
    );
    process.exit(1);
  }
  if (process.env.OPENAPI_OFFLINE !== '1') {
    const remote = await fetchSpec();
    if (remote !== readFileSync(path.join(root, 'openapi/openapi.json'), 'utf8')) {
      console.error(
        'openapi/openapi.json differs from the pinned core revision; run npm run api:fetch.'
      );
      process.exit(1);
    }
  }
  console.log(
    process.env.OPENAPI_OFFLINE === '1'
      ? 'Generated types match openapi/openapi.json (pinned core check skipped).'
      : `OpenAPI document and generated types match core ${pinnedRevision()}.`
  );
} finally {
  rmSync(temp, { recursive: true, force: true });
}
