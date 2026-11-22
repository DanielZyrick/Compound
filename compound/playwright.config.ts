import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// End-to-end tests: run with `npm run test:e2e` (builds first).
// They use dedicated test users in a test database (see e2e/support.ts,
// which refuses any other database) and force AI demo mode, so they never
// touch production data or spend API credits.

// A local Postgres, if set up (README: "End-to-end tests"). Loaded before
// anything else, so it wins over .env.local for the tests and the test
// server. Without the file the tests use the Neon dev branch from .env.local.
const LOCAL_DB = existsSync(".env.e2e");
if (LOCAL_DB) process.loadEnvFile(".env.e2e");

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  // Each worker has its own test user (e2e/support.ts), so tests run side by
  // side. With Postgres on the same machine (CI, or .env.e2e), 4 at once is
  // fine. Against Neon every query crosses the internet and the server keeps
  // at most 5 connections (lib/db/create-db.ts), so more than 2 at once made
  // pages queue for a connection and miss their timeouts.
  workers: process.env.CI || LOCAL_DB ? 4 : 2,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Double Playwright's defaults (30s a test, 5s an expect): creating a track or
  // goal saves a whole plan, and slower machines took longer than the defaults.
  timeout: 60_000,
  expect: { timeout: 10_000 },
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
      CALENDAR_DEMO_MODE: "1", // never call Google Calendar from tests
    },
  },
});
