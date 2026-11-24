// The browser's error reports arrive here and are passed on to Sentry
// (instrumentation-client.ts sends them; lib/monitoring/options.ts). Only
// reports for this app's own DSN are forwarded, without the request headers.
export { POST } from "@sentry/nextjs/tunnel";
