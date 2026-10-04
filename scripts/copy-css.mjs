import { copyFileSync, mkdirSync } from 'node:fs';

mkdirSync(new URL('../dist', import.meta.url), { recursive: true });
copyFileSync(
  new URL('../src/styles/base.css', import.meta.url),
  new URL('../dist/base.css', import.meta.url)
);
