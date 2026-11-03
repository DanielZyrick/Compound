import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { requireOnboardedUser } from "@/lib/auth/dal";
import { googleClient, isCalendarDemo } from "@/lib/calendar/google";
import { consentUrl, STATE_COOKIE } from "@/lib/calendar/oauth";
import { db } from "@/lib/db";

/**
 * "Connect Google Calendar": sends the signed-in user to Google's consent
 * screen. A random state in a short-lived cookie makes sure the answer that
 * comes back to /api/calendar/callback is for this request.
 */
export async function GET(request: NextRequest) {
  const user = await requireOnboardedUser();
  const settings = new URL("/settings", request.url);

  if (isCalendarDemo()) {
    // End-to-end tests: a demo connection, no Google involved.
    await db
      .insertInto("calendar_connections")
      .values({ user_id: user.id, google_email: "demo@example.com", refresh_token: "demo" })
      .onConflict((oc) => oc.column("user_id").doNothing())
      .execute();
    settings.searchParams.set("calendar", "connected");
    return NextResponse.redirect(settings);
  }

  const client = googleClient();
  if (!client) {
    settings.searchParams.set("calendar", "unavailable");
    return NextResponse.redirect(settings);
  }

  const state = randomBytes(32).toString("base64url");
  const redirectUri = new URL("/api/calendar/callback", request.url).toString();
  const response = NextResponse.redirect(consentUrl({ clientId: client.id, redirectUri, state }));
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax", // sent on Google's redirect back, which is a top-level GET
    path: "/api/calendar",
    maxAge: 600,
  });
  return response;
}
