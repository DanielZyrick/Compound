import type { Breadcrumb, ErrorEvent } from "@sentry/nextjs";

// Error tracking with Sentry (instrumentation.ts, instrumentation-client.ts).
// Errors only: no performance tracing and no session replay. Off unless
// NEXT_PUBLIC_SENTRY_DSN is set, so development, the e2e tests and CI never
// send anything. Pure, so the privacy rules are unit tested.

/** Browser reports go through Compound itself (app/api/monitoring/route.ts):
 * the CSP keeps connect-src 'self', and ad blockers don't drop them. */
export const SENTRY_TUNNEL = "/api/monitoring";

const MAX_MESSAGE = 300;

/** Options shared by the browser, Node.js and edge SDKs. */
export function sentryOptions(dsn: string | undefined) {
  return {
    dsn,
    enabled: Boolean(dsn),
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    // No IP addresses, cookies, request bodies or user names: see scrubEvent.
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  };
}

/** A URL without its query string, which can hold search terms or tokens. */
function withoutQuery(url: string): string {
  return url.split(/[?#]/)[0];
}

function shorten(text: string): string {
  return text.length > MAX_MESSAGE ? `${text.slice(0, MAX_MESSAGE)}…` : text;
}

/**
 * What leaves for Sentry: the error, where it happened, the user's internal
 * id and whether it's a demo account. Never request data, headers, cookies
 * or query strings, never an email or name, and messages are cut short in
 * case one quotes something the user typed.
 */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    event.request = { method: event.request.method, url: event.request.url && withoutQuery(event.request.url) };
  }
  if (event.user) event.user = event.user.id === undefined ? undefined : { id: event.user.id };
  if (event.message) event.message = shorten(event.message);
  for (const exception of event.exception?.values ?? []) {
    if (exception.value) exception.value = shorten(exception.value);
  }
  return event;
}

/**
 * Breadcrumbs are the steps before an error. Console lines are dropped (they
 * can print anything), and URLs keep only their path.
 */
export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  if (breadcrumb.category === "console") return null;
  if (breadcrumb.data) {
    const data = { ...breadcrumb.data };
    for (const key of ["url", "from", "to"]) {
      if (typeof data[key] === "string") data[key] = withoutQuery(data[key]);
    }
    breadcrumb.data = data;
  }
  return breadcrumb;
}

/** Whether an error-page error should be reported from the browser. One with a
 * digest came from the server, which has already reported it (onRequestError). */
export function shouldReportFromBrowser(error: unknown): boolean {
  return !(typeof error === "object" && error !== null && "digest" in error && error.digest);
}
