import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root,
  plugins: [react()],
  resolve: {
    alias: {
      '@subcult/rekolekt-web/base.css': fileURLToPath(
        new URL('../src/styles/base.css', import.meta.url)
      ),
      '@subcult/rekolekt-web': fileURLToPath(new URL('../src/index.ts', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: { input: { base: `${root}/index.html`, custom: `${root}/custom.html` } },
  },
  server: {
    proxy: {
      '/api': {
        target: process.env.REKOLEKT_API_URL ?? 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
