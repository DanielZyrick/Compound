import { addDays, weekdayOf } from "@/lib/dates/calendar";
import type { CalendarDate, Weekday } from "@/lib/db/types";

// The week strip on Today: Monday to Sunday, each day marked by how many of
// that day's habits were done. Pure, so it's easy to test.

export type WeekDayStatus =
  | "done" // every habit due that day was done
  | "partial" // some were done
  | "missed" // none were done, and the day is over
  | "pending" // today, nothing done yet
  | "rest" // no habits were due
  | "future";

export type WeekDay = { date: CalendarDate; status: WeekDayStatus; done: number; due: number };

export type WeekHabit = { schedule: Weekday[]; createdOn: CalendarDate; checkins: Set<CalendarDate> };

/** The Monday of the week containing `date`. */
export function weekStart(date: CalendarDate): CalendarDate {
  return addDays(date, -((weekdayOf(date) + 6) % 7)); // weekdayOf: 0 = Sunday
}

export function habitWeek(habits: WeekHabit[], today: CalendarDate): WeekDay[] {
  const monday = weekStart(today);
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    if (date > today) return { date, status: "future", done: 0, due: 0 };

    const weekday = weekdayOf(date);
    const dueHabits = habits.filter((h) => h.createdOn <= date && h.schedule.includes(weekday));
    const due = dueHabits.length;
    const done = dueHabits.filter((h) => h.checkins.has(date)).length;

    let status: WeekDayStatus;
    if (due === 0) status = "rest";
    else if (done === due) status = "done";
    else if (done > 0) status = "partial";
    else status = date === today ? "pending" : "missed";
    return { date, status, done, due };
  });
}
