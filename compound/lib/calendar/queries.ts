import "server-only";
import { addDays } from "@/lib/dates/calendar";
import { db } from "@/lib/db";
import type { CalendarDate } from "@/lib/db/types";
import { demoEvents, parseGoogleEvents, startOfDayIn, type CalendarEvent, type GoogleEvent } from "./events";
import { CalendarError, getAccessToken, isCalendarDemo } from "./google";

const EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

export type ScheduleResult =
  | { status: "not-connected" }
  | { status: "ok"; events: CalendarEvent[] }
  | { status: "revoked" } // Google no longer accepts the connection: reconnect
  | { status: "unavailable" }; // Google is down or slow: try later

/**
 * The user's primary-calendar events for `days` days from `from`, fetched
 * live from Google and never stored. Errors become a status, so a calendar
 * problem never breaks the page around it.
 */
export async function getSchedule(
  user: { id: string; timezone: string },
  from: CalendarDate,
  days: number,
): Promise<ScheduleResult> {
  if (isCalendarDemo()) {
    const connected = await db
      .selectFrom("calendar_connections")
      .select("user_id")
      .where("user_id", "=", user.id)
      .executeTakeFirst();
    return connected ? { status: "ok", events: demoEvents(from, user.timezone) } : { status: "not-connected" };
  }

  try {
    const token = await getAccessToken(user.id);
    if (!token) return { status: "not-connected" };

    const url = new URL(EVENTS_URL);
    url.search = new URLSearchParams({
      timeMin: startOfDayIn(from, user.timezone).toISOString(),
      timeMax: startOfDayIn(addDays(from, days), user.timezone).toISOString(),
      timeZone: user.timezone,
      singleEvents: "true", // repeating events as separate days
      orderBy: "startTime",
      maxResults: "250",
      fields: "items(id,status,summary,location,htmlLink,start,end,attendees(self,responseStatus))",
    }).toString();

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (response.status === 401 || response.status === 403) return { status: "revoked" };
    if (!response.ok) return { status: "unavailable" };
    const body: { items?: GoogleEvent[] } = await response.json();
    return { status: "ok", events: parseGoogleEvents(body.items ?? []) };
  } catch (error) {
    if (error instanceof CalendarError && error.kind === "revoked") return { status: "revoked" };
    console.error("[calendar] events failed:", error instanceof Error ? error.message : error);
    return { status: "unavailable" };
  }
}
