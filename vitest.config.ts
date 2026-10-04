import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './src/tests/setup.ts',
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reportsDirectory: '.artifacts/coverage',
      reporter: ['text', 'json-summary', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/tests/**',
        '**/*.test.{ts,tsx}',
        'src/types/**',
        'src/index.ts',
        'src/atproto.ts',
        'src/metadata/cli.ts',
        'src/metadata/index.ts',
        'src/components/index.ts',
      ],
      thresholds: { lines: 75, functions: 70, branches: 65, statements: 75 },
    },
  },
});
