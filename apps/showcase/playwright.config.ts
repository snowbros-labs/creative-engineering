import { defineConfig, devices } from '@playwright/test';

// Runs against the production build (vite preview), not the dev server.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // Headless WebGL runs on SwiftShader (CPU); more workers starve the 3D tests.
  workers: 2,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'line',
  use: { baseURL: 'http://localhost:4173', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm run build && pnpm run preview',
    url: 'http://localhost:4173/dashboard.html',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
