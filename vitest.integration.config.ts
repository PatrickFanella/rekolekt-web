import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';

// Runs against a real Rekolekt API: set REKOLEKT_API_URL (see integration/README.md).
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    // The API's development CORS policy allows this origin with credentials.
    environmentOptions: { happyDOM: { url: 'http://localhost:5173' } },
    include: ['tests/integration/**/*.test.{ts,tsx}'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
