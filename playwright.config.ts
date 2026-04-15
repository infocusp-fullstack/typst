import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'setup-cxo',
      testMatch: /auth\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/.auth/cxo-user.json',
      },
    },
    {
      name: 'regular-share',
      testMatch: /share\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/.auth/regular-user.json',
      },
    },
    {
      name: 'cxo',
      testMatch: /cxo-user\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        storageState: 'tests/.auth/cxo-user.json',
      },
    },
    { name: 'regular', testMatch: /regular-user\.spec\.ts/, use: { ...devices['Desktop Chrome'], storageState: 'tests/.auth/regular-user.json' } },
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
