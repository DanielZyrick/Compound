import { timingSafeEqual } from "node:crypto";

// The Google side of "Connect Google Calendar": the consent link and the
// checks on what comes back. Pure, so it's easy to test.

export const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
export const STATE_COOKIE = "calendar_oauth_state";

/** Google's consent screen: read-only calendar access, plus the account's email to show in Settings. */
export function consentUrl({ clientId, redirectUri, state }: { clientId: string; redirectUri: string; state: string }) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: `openid email ${CALENDAR_SCOPE}`,
    access_type: "offline", // a refresh token, so the server can fetch events later
    prompt: "consent", // Google only sends a refresh token on consent
    state,
  }).toString();
  return url.toString();
}

/** True when the user left the calendar box ticked on the consent screen. */
export function grantedCalendar(scope: string | undefined): boolean {
  return (scope ?? "").split(" ").includes(CALENDAR_SCOPE);
}

/**
 * The email in an ID token from Google's token endpoint. It came straight
 * from Google over TLS, so the signature doesn't need checking here; it's
 * only shown to the user, never used to sign anyone in.
 */
export function emailFromIdToken(idToken: string | undefined): string | null {
  try {
    const payload = JSON.parse(Buffer.from(idToken!.split(".")[1], "base64url").toString("utf8"));
    return typeof payload.email === "string" ? payload.email : null;
  } catch {
    return null;
  }
}

/** Compares the state Google sent back with the one in the cookie, in constant time. */
export function statesMatch(fromGoogle: string | null, fromCookie: string | undefined): boolean {
  if (!fromGoogle || !fromCookie) return false;
  const a = Buffer.from(fromGoogle);
  const b = Buffer.from(fromCookie);
  return a.length === b.length && timingSafeEqual(a, b);
}
