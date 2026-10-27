import "server-only";
import { weekdayOf } from "@/lib/dates/calendar";
import { db } from "@/lib/db";
import type { CalendarDate, Weekday } from "@/lib/db/types";
import { currentStreak } from "./streaks";

export type TodayHabit = {
  id: string;
  name: string;
  schedule: Weekday[];
  doneToday: boolean;
  streak: number;
};

/**
 * The user's active habits scheduled for `today` (in their timezone), with
 * whether each is done and its current streak. Also returns how many active
 * habits they have in total, to tell "nothing today" from "no habits yet".
 */
export async function getTodayHabits(userId: string, today: CalendarDate) {
  const habits = await db
    .selectFrom("habits")
    .select(["id", "name", "schedule"])
    .where("user_id", "=", userId)
    .where("archived_at", "is", null)
    .orderBy("created_at")
    .execute();

  const weekday = weekdayOf(today);
  const scheduled = habits.filter((h) => h.schedule.includes(weekday));
  if (scheduled.length === 0) return { habits: [], activeCount: habits.length };

  const checkins = await db
    .selectFrom("habit_checkins")
    .select(["habit_id", "date"])
    .where("habit_id", "in", scheduled.map((h) => h.id))
    .where("date", "<=", today)
    .execute();

  const datesByHabit = new Map<string, CalendarDate[]>();
  for (const { habit_id, date } of checkins) {
    datesByHabit.set(habit_id, [...(datesByHabit.get(habit_id) ?? []), date]);
  }

  const result: TodayHabit[] = scheduled.map((habit) => {
    const dates = datesByHabit.get(habit.id) ?? [];
    return {
      ...habit,
      doneToday: dates.includes(today),
      streak: currentStreak({ schedule: habit.schedule, checkins: dates, today }),
    };
  });

  return { habits: result, activeCount: habits.length };
}
