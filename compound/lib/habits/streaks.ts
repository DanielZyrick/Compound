import { addDays, weekdayOf } from "@/lib/dates/calendar";
import type { CalendarDate, Weekday } from "@/lib/db/types";

/**
 * A habit's current streak: how many of its scheduled days in a row, counting
 * back from today, have a check-in. Always calculated, never stored.
 *
 * - Only scheduled days count. A Mon/Wed/Fri habit keeps its streak through
 *   Tuesday, and a check-in on an unscheduled day neither adds nor breaks.
 * - Today not being checked yet doesn't break the streak: the day isn't over.
 *   It breaks once a scheduled day has passed without a check-in.
 * - Uses the habit's current schedule for its whole history.
 */
export function currentStreak({
  schedule,
  checkins,
  today,
}: {
  schedule: readonly Weekday[];
  checkins: readonly CalendarDate[];
  today: CalendarDate;
}): number {
  if (schedule.length === 0 || checkins.length === 0) return 0;

  const done = new Set(checkins);
  const scheduled = new Set(schedule);
  // Nothing before the first check-in can count, so stop there.
  const earliest = checkins.reduce((min, d) => (d < min ? d : min));

  let streak = 0;
  for (let date = today; date >= earliest; date = addDays(date, -1)) {
    if (!scheduled.has(weekdayOf(date))) continue;
    if (done.has(date)) streak++;
    else if (date !== today) break;
  }
  return streak;
}

/**
 * A habit's best streak ever: the longest run of scheduled days in a row that
 * all have a check-in. Like currentStreak, unscheduled days are skipped (they
 * neither extend nor break a run) and check-ins on them don't count.
 */
export function bestStreak({
  schedule,
  checkins,
}: {
  schedule: readonly Weekday[];
  checkins: readonly CalendarDate[];
}): number {
  const scheduled = new Set(schedule);
  const done = [...new Set(checkins)].filter((d) => scheduled.has(weekdayOf(d))).sort();
  if (done.length === 0) return 0;

  const doneSet = new Set(done);
  let best = 0;
  let run = 0;
  // Walk every day from the first to the last check-in.
  for (let date = done[0]; date <= done[done.length - 1]; date = addDays(date, 1)) {
    if (!scheduled.has(weekdayOf(date))) continue;
    run = doneSet.has(date) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}
