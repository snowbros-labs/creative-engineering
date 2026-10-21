import { defineConfig, devices } from '@playwright/test';

// Runs against the composed production build: the flagship at / and the showcase at /demos/.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // Headless WebGL is SwiftShader (CPU); more workers starve the 3D scenes.
  workers: 2,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'line',
  use: { baseURL: 'http://localhost:4174', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm run build:site && pnpm run preview',
    url: 'http://localhost:4174/',
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
