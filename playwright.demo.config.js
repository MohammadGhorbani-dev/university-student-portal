import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './demo-tests',
  fullyParallel: true,
  workers: process.env.CI ? 1 : undefined,
  retries: 0,
  reporter: 'line',
  use: { baseURL: 'http://127.0.0.1:3010', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'npm run preview:demo',
    url: 'http://127.0.0.1:3010',
    reuseExistingServer: false,
  },
});
