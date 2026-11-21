// Security headers sent with every response (next.config.ts → headers()).
//
// The Content Security Policy has no nonce: Compound uses Partial
// Prerendering (cacheComponents), which the Next.js docs say can't carry a
// per-request nonce. So inline scripts (Next's page data) and inline styles
// (Shiki's code colours) are allowed, and everything else is locked to this
// site. The browser never talks to another site directly: Claude, Google
// Calendar and GitHub are only called from the server.

/** Where profile pictures come from: Google and GitHub sign-in. */
export const AVATAR_HOSTS = ["https://lh3.googleusercontent.com", "https://avatars.githubusercontent.com"];

/** Where the sign-in forms redirect to (a form without JavaScript follows that redirect). */
export const SIGN_IN_HOSTS = ["https://accounts.google.com", "https://github.com"];

export function contentSecurityPolicy({ isDev }: { isDev: boolean }): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // React's dev overlay uses eval to rebuild server error stacks; production never does.
    "script-src": ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", ...AVATAR_HOSTS],
    "font-src": ["'self'"],
    "connect-src": ["'self'"],
    "form-action": ["'self'", ...SIGN_IN_HOSTS],
    "frame-ancestors": ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
  };
  const policy = Object.entries(directives).map(([name, sources]) => `${name} ${sources.join(" ")}`);
  // Turns any http:// link into https://. Left out in development, which runs on plain http.
  if (!isDev) policy.push("upgrade-insecure-requests");
  return policy.join("; ");
}

export function securityHeaders({ isDev }: { isDev: boolean }): { key: string; value: string }[] {
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy({ isDev }) },
    // Browsers ignore this on plain http, so it's safe locally.
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    // Other sites see only "compound…", never a page path such as a contact's.
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
    // frame-ancestors 'none' for browsers too old to know it.
    { key: "X-Frame-Options", value: "DENY" },
  ];
}
