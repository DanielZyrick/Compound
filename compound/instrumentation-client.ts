import * as Sentry from "@sentry/nextjs";
import { SENTRY_TUNNEL, sentryOptions } from "@/lib/monitoring/options";

// Browser-side error tracking (lib/monitoring/options.ts). Does nothing
// without NEXT_PUBLIC_SENTRY_DSN. Reports go through Compound's own server.
Sentry.init({ ...sentryOptions(process.env.NEXT_PUBLIC_SENTRY_DSN), tunnel: SENTRY_TUNNEL });

// Remembers which page a browser error happened after a navigation.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
