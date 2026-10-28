import { addDays, weekdayOf } from "@/lib/dates/calendar";
import type { CalendarDate, Weekday } from "@/lib/db/types";

/**
 * What one day looks like on a habit's check-in grid:
 * - done: checked in
 * - missed: scheduled, past, no check-in
 * - pending: today, scheduled, not checked in yet (not a miss: the day isn't over)
 * - off: not scheduled that weekday
 * - before: the habit didn't exist yet
 */
export type DayStatus = "done" | "missed" | "pending" | "off" | "before";

export type GridDay = { date: CalendarDate; status: DayStatus };

/** The last `days` days, oldest first and ending today, for one habit. */
export function checkinGrid({
  schedule,
  checkins,
  createdOn,
  today,
  days = 30,
}: {
  schedule: readonly Weekday[];
  checkins: ReadonlySet<CalendarDate>;
  createdOn: CalendarDate;
  today: CalendarDate;
  days?: number;
}): GridDay[] {
  const scheduled = new Set(schedule);
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, i - days + 1);
    let status: DayStatus;
    if (checkins.has(date)) status = "done";
    else if (date < createdOn) status = "before";
    else if (!scheduled.has(weekdayOf(date))) status = "off";
    else if (date === today) status = "pending";
    else status = "missed";
    return { date, status };
  });
}

/** How many scheduled, finished days were done, for the grid's text summary. */
export function gridSummary(grid: GridDay[]) {
  const done = grid.filter((d) => d.status === "done").length;
  const missed = grid.filter((d) => d.status === "missed").length;
  return { done, missed, scheduled: done + missed };
}
