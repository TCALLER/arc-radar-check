import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Fixed time zone so date formatting is the same on every machine.
process.env.TZ = 'UTC';

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@samples': fromRoot('./samples'),
      '@': fromRoot('./src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    env: {
      NEXT_PUBLIC_API_BASE_URL: 'https://api.test.local',
      NEXT_PUBLIC_API_MOCKING: 'enabled',
      NEXT_PUBLIC_AUTH_MOCKING: 'enabled',
      NEXT_PUBLIC_ARC_RPC_URL: 'https://rpc.test.local',
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/app/**',
        'src/mocks/**',
        'src/**/mocks.ts',
        'src/**/types.ts',
        'src/**/*.d.ts',
        'src/common/components/ui/**',
        'src/common/test/**',
      ],
      thresholds: { lines: 80, statements: 80, functions: 80, branches: 80 },
    },
  },
});
