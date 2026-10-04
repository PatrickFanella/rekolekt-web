import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      index: 'src/index.ts',
      atproto: 'src/atproto.ts',
      'metadata/index': 'src/metadata/index.ts',
    },
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    target: 'es2022',
    external: ['react', 'react-dom', '@tanstack/react-query', '@atproto/oauth-client-browser'],
    esbuildOptions(options) {
      options.jsx = 'automatic';
    },
  },
  {
    entry: { 'metadata/cli': 'src/metadata/cli.ts' },
    format: ['esm'],
    platform: 'node',
    target: 'node20',
    sourcemap: false,
    clean: false,
    banner: { js: '#!/usr/bin/env node' },
  },
]);
