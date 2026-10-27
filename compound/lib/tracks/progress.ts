import { daysBetween } from "@/lib/dates/calendar";
import type { CalendarDate } from "@/lib/db/types";

/**
 * Which day of a track today is: day 1 on the start date, then one more each
 * calendar day, never below 1 or past the last day.
 */
export function currentTrackDay(startDate: CalendarDate, today: CalendarDate, totalDays: number) {
  const day = daysBetween(startDate, today) + 1;
  return Math.min(Math.max(day, 1), totalDays);
}
