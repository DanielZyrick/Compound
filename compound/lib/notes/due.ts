import { daysBetween } from "@/lib/dates/calendar";
import type { CalendarDate } from "@/lib/db/types";

// What a note's due date means today: the label on the sticky note and how
// urgent it is. Pure, so it's easy to test.

export type DueTone = "overdue" | "today" | "upcoming" | "done";

/** Overdue or due today: the notes that need attention now. */
export function isDue(dueOn: CalendarDate | null, today: CalendarDate): boolean {
  return dueOn !== null && dueOn <= today;
}

function shortDate(date: CalendarDate, today: CalendarDate, weekday: boolean): string {
  return new Intl.DateTimeFormat("en-US", {
    ...(weekday && { weekday: "short" }),
    month: "short",
    day: "numeric",
    ...(date.slice(0, 4) !== today.slice(0, 4) && { year: "numeric" }),
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

/**
 * "Due today", "Due tomorrow", "Due Fri, Nov 13", "Overdue · 2 days". A note
 * that's ticked off only says when it was due: "Was due Nov 13".
 */
export function describeDue(dueOn: CalendarDate, today: CalendarDate, done = false): { label: string; tone: DueTone } {
  if (done) return { label: `Was due ${shortDate(dueOn, today, false)}`, tone: "done" };
  const days = daysBetween(today, dueOn);
  if (days < 0) return { label: `Overdue · ${-days} ${days === -1 ? "day" : "days"}`, tone: "overdue" };
  if (days === 0) return { label: "Due today", tone: "today" };
  if (days === 1) return { label: "Due tomorrow", tone: "upcoming" };
  return { label: `Due ${shortDate(dueOn, today, true)}`, tone: "upcoming" };
}
