import { defineConfig, devices } from '@playwright/test';

const WEB_URL = process.env.WEB_URL ?? 'http://localhost:3000';

/**
 * Browser e2e tests. The API (http://localhost:3001) and a seeded database
 * (pnpm db:seed + pnpm --filter @kizuna/api seed:users) must be running;
 * Playwright starts the web dev server itself (or reuses a running one).
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    baseURL: WEB_URL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm dev',
    url: WEB_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
