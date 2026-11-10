import { defineConfig, devices } from '@playwright/test';
const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173);
const baseURL = `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: './tests', fullyParallel: true,
  use: { baseURL, ...devices['Desktop Chrome'] },
  webServer: {
    command: `npm run dev -- --port ${port} --strictPort`, url: baseURL,
    reuseExistingServer: !process.env.CI && !process.env.PLAYWRIGHT_PORT,
  },
});
