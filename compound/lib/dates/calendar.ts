import type { CalendarDate, Weekday } from "@/lib/db/types";

// Calendar dates are "YYYY-MM-DD" strings with no time or timezone, matching
// Postgres `date` columns. Arithmetic is done in UTC, where every day is
// exactly 24 hours, so daylight saving changes can't skip or repeat a day.

/** Today's date in a timezone, e.g. todayIn("Asia/Manila") → "2026-10-27". */
export function todayIn(timezone: string, now: Date = new Date()): CalendarDate {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function toUtcDate(date: CalendarDate): Date {
  return new Date(`${date}T00:00:00Z`);
}

/** The date `days` days after `date` (negative goes back). */
export function addDays(date: CalendarDate, days: number): CalendarDate {
  const d = toUtcDate(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The weekday of a date: 0 = Sunday ... 6 = Saturday. */
export function weekdayOf(date: CalendarDate): Weekday {
  return toUtcDate(date).getUTCDay() as Weekday;
}

/** A readable form of a date, e.g. "Tuesday, October 27". */
export function formatLongDate(date: CalendarDate): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(toUtcDate(date));
}

/** Whole days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: CalendarDate, to: CalendarDate): number {
  return Math.round((toUtcDate(to).getTime() - toUtcDate(from).getTime()) / 86_400_000);
}

/** A compact form of a date, e.g. "Dec 8" (or "Dec 8, 2027" outside `currentYear`). */
export function formatShortDate(date: CalendarDate, currentYear?: string): string {
  const sameYear = currentYear === undefined || date.slice(0, 4) === currentYear;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
    timeZone: "UTC",
  }).format(toUtcDate(date));
}
