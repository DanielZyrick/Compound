import { addDays, weekdayOf } from "@/lib/dates/calendar";
import type { CalendarDate, Weekday } from "@/lib/db/types";

// Filling in a missed day: a habit can be checked off (or unchecked) for any
// of the last few days it was due. Pure, so the page and the server action
// share one rule.

/** How many days back can be filled in, not counting today. */
export const FILL_IN_DAYS = 7;

export type FillInHabit = { schedule: Weekday[]; createdOn: CalendarDate };

export type PastDay = { date: CalendarDate; done: boolean; open: boolean };

/**
 * True when `date` is one of the last FILL_IN_DAYS days before today, the
 * habit already existed, and it was scheduled that day. Today itself is
 * checked off on Today, not here.
 */
export function canFillIn(habit: FillInHabit, date: CalendarDate, today: CalendarDate): boolean {
  return (
    date < today &&
    date >= addDays(today, -FILL_IN_DAYS) &&
    date >= habit.createdOn &&
    habit.schedule.includes(weekdayOf(date))
  );
}

/** The last FILL_IN_DAYS days before today, oldest first, with whether each was done and can be changed. */
export function pastDays(habit: FillInHabit & { checkins: Set<CalendarDate> }, today: CalendarDate): PastDay[] {
  return Array.from({ length: FILL_IN_DAYS }, (_, i) => {
    const date = addDays(today, i - FILL_IN_DAYS);
    return { date, done: habit.checkins.has(date), open: canFillIn(habit, date, today) };
  });
}
