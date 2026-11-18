// Auth.js sends sign-in failures to /login?error=<code>. Only a few codes are
// passed through as-is; every other failure arrives as "Configuration" so
// internal details never reach the browser (see isClientError in @auth/core).

const MESSAGES: Record<string, string> = {
  // Our signIn callback refused the account: no verified email.
  AccessDenied:
    "We couldn't confirm your email address. Make sure it's verified in your Google or GitHub account, then try again.",
  // The user pressed Cancel on Google or GitHub, or the provider returned an error.
  OAuthCallbackError: "Sign-in was cancelled or didn't finish. Please try again.",
  // The form came from a stale tab, so its CSRF token no longer matched.
  MissingCSRF: "Your sign-in session expired. Please try again.",
};

// "Try the demo" was refused: too many demos were started in the last hour.
const DEMO_BUSY = "Lots of people are trying the demo right now. Please try again in a few minutes.";

const FALLBACK = "Something went wrong on our side. Please try again in a minute.";

/** The message to show for a ?error= value, or null when there's no error. */
export function loginErrorMessage(
  error: string | string[] | undefined,
  detail?: string | string[] | undefined,
): string | null {
  // ?error=a&error=b arrives as an array; the first one is enough.
  const code = Array.isArray(error) ? error[0] : error;
  if (!code) return null;
  if (code === "CredentialsSignin") {
    return (Array.isArray(detail) ? detail[0] : detail) === "demo_busy" ? DEMO_BUSY : FALLBACK;
  }
  return Object.hasOwn(MESSAGES, code) ? MESSAGES[code] : FALLBACK;
}
