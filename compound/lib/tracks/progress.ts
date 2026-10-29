import { daysBetween } from "@/lib/dates/calendar";
import type { CalendarDate } from "@/lib/db/types";

/** The first day not done yet: where the learner is. Null once every day is done. */
export function nextTrackDay(totalDays: number, completedDays: ReadonlySet<number>): number | null {
  for (let day = 1; day <= totalDays; day++) {
    if (!completedDays.has(day)) return day;
  }
  return null;
}

/**
 * Which day of a track today is, by the calendar: day 1 on the start date, then one more each
 * calendar day, never below 1 or past the last day.
 */
export function currentTrackDay(startDate: CalendarDate, today: CalendarDate, totalDays: number) {
  const day = daysBetween(startDate, today) + 1;
  return Math.min(Math.max(day, 1), totalDays);
}
