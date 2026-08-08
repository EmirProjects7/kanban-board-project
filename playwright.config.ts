import {defineConfig, devices} from '@playwright/test'

export default defineConfig({
    testDir: './e2e',
    // One database and one rate limiter sit behind these tests, so they run in
    // sequence rather than competing for both.
    fullyParallel: false,
    workers: 1,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [['list'], ['html', {open: 'never'}]] : 'list',
    use: {
        // Not 127.0.0.1: CORS and the socket handshake are both pinned to the
        // FRONTEND_URL origin, and the two spellings are different origins.
        baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
        trace: 'on-first-retry',
        video: 'retain-on-failure',
    },
    projects: [{name: 'chromium', use: {...devices['Desktop Chrome']}}],
    // Locally this brings up the whole stack, database included. The health
    // endpoint is the thing to wait for: Vite is serving long before the API
    // has compiled and connected. CI sets E2E_BASE_URL because it starts its
    // own postgres service and runs the built output instead.
    webServer: process.env.E2E_BASE_URL
        ? undefined
        : {
              command: 'npm run dev',
              url: 'http://127.0.0.1:3000/health',
              reuseExistingServer: !process.env.CI,
              timeout: 120_000,
          },
})
