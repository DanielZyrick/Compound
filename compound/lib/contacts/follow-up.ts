import { daysBetween, formatShortDate } from "@/lib/dates/calendar";
import type { CalendarDate } from "@/lib/db/types";

// How a follow-up date reads next to a contact. Pure, so it's easy to test.

export type FollowUp = { label: string; due: boolean };

/** "Overdue · Oct 28", "Today", "Tomorrow", "In 5 days" or "Dec 8". `due` means today or earlier. */
export function describeFollowUp(date: CalendarDate, today: CalendarDate): FollowUp {
  const days = daysBetween(today, date);
  if (days < 0) return { label: `Overdue · ${formatShortDate(date, today.slice(0, 4))}`, due: true };
  if (days === 0) return { label: "Today", due: true };
  if (days === 1) return { label: "Tomorrow", due: false };
  if (days <= 7) return { label: `In ${days} days`, due: false };
  return { label: formatShortDate(date, today.slice(0, 4)), due: false };
}

/** Postgres ILIKE pattern for a search box: `%` and `_` typed by the user match literally. */
export function containsPattern(search: string): string {
  return `%${search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}
