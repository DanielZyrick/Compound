import type { NextConfig } from "next";
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

export default nextConfig;
