import { NextResponse, type NextRequest } from "next/server";
import { requireOnboardedUser } from "@/lib/auth/dal";
import { CalendarError, exchangeCode, googleClient, saveConnection } from "@/lib/calendar/google";
import { emailFromIdToken, grantedCalendar, STATE_COOKIE, statesMatch } from "@/lib/calendar/oauth";

/**
 * Where Google sends the user back after the consent screen. Checks the
 * state, swaps the code for tokens, and saves them encrypted. Every outcome
 * goes back to Settings with a short status for the message there.
 */
export async function GET(request: NextRequest) {
  const user = await requireOnboardedUser();
  const params = request.nextUrl.searchParams;

  function done(status: "connected" | "denied" | "no-access" | "failed" | "unavailable") {
    const settings = new URL("/settings", request.url);
    settings.searchParams.set("calendar", status);
    const response = NextResponse.redirect(settings);
    response.cookies.delete({ name: STATE_COOKIE, path: "/api/calendar" });
    return response;
  }

  if (!googleClient()) return done("unavailable");
  if (!statesMatch(params.get("state"), request.cookies.get(STATE_COOKIE)?.value)) return done("failed");
  if (params.get("error")) return done("denied"); // they pressed Cancel
  const code = params.get("code");
  if (!code) return done("failed");

  try {
    const redirectUri = new URL("/api/calendar/callback", request.url).toString();
    const tokens = await exchangeCode(code, redirectUri);
    // Google lets people untick the calendar box on the consent screen.
    if (!grantedCalendar(tokens.scope)) return done("no-access");
    if (!tokens.refresh_token) return done("failed");
    await saveConnection(user.id, { ...tokens, refresh_token: tokens.refresh_token }, emailFromIdToken(tokens.id_token));
    return done("connected");
  } catch (error) {
    console.error("[calendar] connect failed:", error instanceof CalendarError ? error.message : error);
    return done("failed");
  }
}
