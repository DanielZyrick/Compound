import { addDays } from "@/lib/dates/calendar";
import type { CalendarDate } from "@/lib/db/types";

// Calendar events as Compound shows them: read from Google's response, placed
// on days in the user's timezone, with the next one picked out. Pure, so it's
// easy to test.

export type CalendarEvent = {
  id: string;
  title: string;
  allDay: boolean;
  /** Timed events: ISO instants. All-day events: dates, with `end` exclusive (Google's convention). */
  start: string;
  end: string;
  location: string | null;
  link: string | null; // the event in Google Calendar
};

type GoogleTime = { dateTime?: string; date?: string };
export type GoogleEvent = {
  id?: string;
  status?: string;
  summary?: string;
  location?: string;
  htmlLink?: string;
  start?: GoogleTime;
  end?: GoogleTime;
  attendees?: { self?: boolean; responseStatus?: string }[];
};

/** Google's events as ours: cancelled and declined ones dropped, missing titles named. */
export function parseGoogleEvents(items: GoogleEvent[]): CalendarEvent[] {
  return items.flatMap((item) => {
    if (item.status === "cancelled" || !item.id || !item.start || !item.end) return [];
    if (item.attendees?.some((a) => a.self && a.responseStatus === "declined")) return [];
    const allDay = Boolean(item.start.date);
    const start = item.start.dateTime ?? item.start.date;
    const end = item.end.dateTime ?? item.end.date;
    if (!start || !end) return [];
    const link = item.htmlLink?.startsWith("https://") ? item.htmlLink : null;
    return [{ id: item.id, title: item.summary?.trim() || "(No title)", allDay, start, end, location: item.location ?? null, link }];
  });
}

/** How far a timezone is ahead of UTC at an instant, in milliseconds. */
function offsetAt(instant: number, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - instant;
}

/** The instant a local date starts (midnight) in a timezone, e.g. for Google's timeMin. */
export function startOfDayIn(date: CalendarDate, timezone: string): Date {
  const midnightUtc = Date.parse(`${date}T00:00:00Z`);
  // Two passes settle the offset on days when daylight saving changes.
  let instant = midnightUtc - offsetAt(midnightUtc, timezone);
  instant = midnightUtc - offsetAt(instant, timezone);
  return new Date(instant);
}

/** The local date of an instant in a timezone. */
export function dateIn(iso: string, timezone: string): CalendarDate {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date(iso));
}

/** "9:30 AM" in the user's timezone. */
export function timeIn(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", minute: "2-digit" }).format(
    new Date(iso),
  );
}

export type ScheduleDay = { date: CalendarDate; allDay: CalendarEvent[]; timed: CalendarEvent[] };

/**
 * `days` days from `from`, each with its events: all-day events on every day
 * they cover, timed events on the day they start, in start order.
 */
export function groupByDay(events: CalendarEvent[], from: CalendarDate, days: number, timezone: string): ScheduleDay[] {
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(from, i);
    return {
      date,
      allDay: events.filter((e) => e.allDay && e.start <= date && date < e.end),
      timed: events
        .filter((e) => !e.allDay && dateIn(e.start, timezone) === date)
        .sort((a, b) => Date.parse(a.start) - Date.parse(b.start)),
    };
  });
}

/** The event happening now, or the next one to start; null when the rest of the day is free. */
export function nextEvent(timed: CalendarEvent[], now: Date): { event: CalendarEvent; minutes: number } | null {
  const event = timed.find((e) => Date.parse(e.end) > now.getTime());
  if (!event) return null;
  return { event, minutes: Math.max(0, Math.ceil((Date.parse(event.start) - now.getTime()) / 60_000)) };
}

/** "Now", "in 25 min", "in 2 h 5 min". */
export function describeStartsIn(minutes: number): string {
  if (minutes <= 0) return "Now";
  if (minutes < 60) return `in ${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `in ${h} h` : `in ${h} h ${m} min`;
}

/** Demo mode (end-to-end tests, no Google): a believable day and week around `today`. */
export function demoEvents(today: CalendarDate, timezone: string): CalendarEvent[] {
  const at = (date: CalendarDate, hour: number, minute = 0) =>
    new Date(startOfDayIn(date, timezone).getTime() + (hour * 60 + minute) * 60_000).toISOString();
  const timed = (id: string, title: string, date: CalendarDate, from: [number, number], to: [number, number], location: string | null = null) => ({
    id,
    title,
    allDay: false,
    start: at(date, ...from),
    end: at(date, ...to),
    location,
    link: null,
  });
  return [
    timed("demo-1", "Team standup", today, [9, 30], [9, 45], "Google Meet"),
    timed("demo-2", "Lunch with Ana", today, [12, 30], [13, 30], "Salcedo Market"),
    timed("demo-3", "Portfolio review", today, [16, 0], [17, 0]),
    { id: "demo-4", title: "Mom's birthday", allDay: true, start: addDays(today, 1), end: addDays(today, 2), location: null, link: null },
    timed("demo-5", "Dentist", addDays(today, 2), [10, 0], [11, 0], "Makati Medical Center"),
    timed("demo-6", "Run club", addDays(today, 3), [6, 0], [7, 0]),
  ];
}
