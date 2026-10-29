import { addDays, weekdayOf } from "@/lib/dates/calendar";
import type { CalendarDate, Weekday } from "@/lib/db/types";

// Small, pure rules for lessons, kept here so they're easy to test.

/** A day opens on its own date: day 1 on the start date, day 2 the next day, and so on. */
export function unlockDate(startDate: CalendarDate, dayNumber: number): CalendarDate {
  return addDays(startDate, dayNumber - 1);
}

/**
 * A day is open on its own date (`calendarDay` is today's day of the track),
 * or as soon as the day before it is done. So learners can go at their own
 * pace, in order, and finish a 30-day track in a week if they like.
 */
export function isDayOpen(dayNumber: number, calendarDay: number, completedDays: ReadonlySet<number>): boolean {
  return dayNumber <= calendarDay || completedDays.has(dayNumber - 1);
}

/** Open-answer exercises get up to this many AI reviews each. */
export const MAX_FEEDBACK_PER_EXERCISE = 3;

/** A lesson can be completed once every exercise has at least one attempt. */
export function canComplete(exerciseCount: number, attemptedIndexes: Iterable<number>): boolean {
  const attempted = new Set(attemptedIndexes);
  return Array.from({ length: exerciseCount }, (_, i) => i).every((i) => attempted.has(i));
}

/**
 * Whether finishing a lesson should check off the track's habit today: only
 * if there is a habit, it's still active, and it's scheduled for today.
 */
export function shouldCheckHabit(
  habit: { archived: boolean; schedule: readonly Weekday[] } | null,
  today: CalendarDate,
): boolean {
  return habit !== null && !habit.archived && habit.schedule.includes(weekdayOf(today));
}
