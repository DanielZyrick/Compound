import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/monitoring/options";

// Server-side error tracking (lib/monitoring/options.ts). register runs once
// when a server starts; it does nothing without NEXT_PUBLIC_SENTRY_DSN.
export function register() {
  Sentry.init({
    ...sentryOptions(process.env.NEXT_PUBLIC_SENTRY_DSN),
    // Lets app/api/monitoring/route.ts pass the browser's reports on to Sentry.
    ...(process.env.NEXT_RUNTIME === "nodejs" ? { integrations: [Sentry.serveTunnelIntegration()] } : {}),
  });
}

// Errors thrown by pages, server actions and route handlers that the app
// didn't handle itself. Handled ones (an AI timeout, a form error) aren't sent.
export const onRequestError = Sentry.captureRequestError;
