/**
 * Checks that error tracking works: in development, opening
 * /api/monitoring-check throws a test error, which should show up in Sentry
 * when NEXT_PUBLIC_SENTRY_DSN is set. In production it's a plain 404.
 */
export function GET() {
  if (process.env.NODE_ENV !== "development") return new Response("Not found", { status: 404 });
  throw new Error("Monitoring check: a test error from Compound");
}
