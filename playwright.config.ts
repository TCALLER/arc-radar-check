import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: `http://localhost:${PORT}`, trace: 'on-first-retry' },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      NEXT_PUBLIC_API_BASE_URL: 'https://api.test.local',
      NEXT_PUBLIC_API_MOCKING: 'enabled',
      NEXT_PUBLIC_AUTH_MOCKING: 'enabled',
      NEXT_PUBLIC_ARC_RPC_URL: 'https://rpc.test.local',
      // Pinned so a local .env.local can't change the locked-result price the tests expect.
      NEXT_PUBLIC_CHECK_PRICE_USDC: '0.50',
    },
  },
});
