import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";
import { securityHeaders } from "./lib/security/headers";

const nextConfig: NextConfig = {
  // Responses don't announce "X-Powered-By: Next.js".
  poweredByHeader: false,
  // Security headers on every response (see lib/security/headers.ts).
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders({ isDev: process.env.NODE_ENV === "development" }) }];
  },
  experimental: {
    agentFeedback: true,
    // Room for a 4 MB resume PDF (lib/profile/resume.ts); the default is 1 MB.
    serverActions: { bodySizeLimit: "5mb" },
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

// Sentry (lib/monitoring/options.ts). With SENTRY_AUTH_TOKEN, SENTRY_ORG and
// SENTRY_PROJECT set (on Vercel), the build uploads source maps so errors show
// the real file and line; without them it builds as before.
export default withSentryConfig(nextConfig, {
  silent: !process.env.CI,
  telemetry: false,
});
