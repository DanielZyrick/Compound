import { defineConfig, devices } from "@playwright/test";

// End-to-end tests: run with `npm run test:e2e` (builds first).
// They use a dedicated test user in the DEV database (see e2e/support.ts,
// which refuses any other database) and force AI demo mode, so they never
// touch production data or spend API credits.

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  // One shared test user, so tests run one at a time.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  reporter: [["list"], ["html", { open: "never" }]],
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  // The installed Microsoft Edge, so no separate browser download is needed.
  projects: [
    { name: "desktop", use: { ...devices["Desktop Edge"], channel: "msedge" } },
    { name: "mobile", use: { ...devices["Pixel 7"], channel: "msedge" } },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      AUTH_TRUST_HOST: "true", // next start is a production server on localhost
      AI_DEMO_MODE: "1", // never call the AI from tests
    },
  },
});
