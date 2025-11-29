import { resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';

// Load environment variables from .env file
config({ path: resolve(__dirname, '.env') });

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    // Enable video recording for visual feedback
    video: 'retain-on-failure',
    // Take screenshots on failure
    screenshot: 'only-on-failure',
    // Slow down actions to make them more visible
    actionTimeout: 10000,
    // Show browser in UI mode (the preview in Playwright UI)
    headless: false,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Show browser by default (can override with --headless flag)
        headless: !!process.env.CI,
      },
    },
    // Uncomment to test on other browsers:
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],
  // Disable webServer when running with SST dev (pnpm dev)
  // SST dev mode already starts the server
  // webServer: {
  //   command: 'pnpm --filter web dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
