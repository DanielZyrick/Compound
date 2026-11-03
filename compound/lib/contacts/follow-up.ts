import { addDays, daysBetween, formatShortDate } from "@/lib/dates/calendar";
import type { CalendarDate } from "@/lib/db/types";

// Follow-up dates: how they read next to a contact, and the next one after
// getting in touch. Pure, so it's easy to test.

/** After logging a touchpoint: no follow-up, a set time from today, or a chosen date. */
export const NEXT_FOLLOW_UPS = ["none", "1w", "2w", "1m"] as const;
export type NextFollowUp = (typeof NEXT_FOLLOW_UPS)[number] | CalendarDate;

export const NEXT_FOLLOW_UP_LABELS: Record<(typeof NEXT_FOLLOW_UPS)[number], string> = {
  none: "None",
  "1w": "In 1 week",
  "2w": "In 2 weeks",
  "1m": "In 1 month",
};

/** The follow-up date to save, or null for none. A chosen date in the past counts as none. */
export function nextFollowUpDate(choice: NextFollowUp, today: CalendarDate): CalendarDate | null {
  switch (choice) {
    case "none":
      return null;
    case "1w":
      return addDays(today, 7);
    case "2w":
      return addDays(today, 14);
    case "1m":
      return addDays(today, 30);
    default:
      return choice >= today ? choice : null;
  }
}

/** "Today", "Yesterday", "5 days ago", or a date for anything older than a month. */
export function describeLastContact(date: CalendarDate, today: CalendarDate): string {
  const days = daysBetween(date, today);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days <= 30) return `${days} days ago`;
  return formatShortDate(date, today.slice(0, 4));
}

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
