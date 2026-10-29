import "server-only";
import { todayIn, weekdayOf } from "@/lib/dates/calendar";
import { db } from "@/lib/db";
import type { CalendarDate, Weekday } from "@/lib/db/types";
import { currentStreak } from "./streaks";
import { habitWeek, weekStart, type WeekDay } from "./week";

export type HabitSummary = {
  id: string;
  name: string;
  schedule: Weekday[];
  doneToday: boolean;
  streak: number;
  totalCheckins: number;
};

export type ArchivedHabit = { id: string; name: string };

type HabitRow = { id: string; name: string; schedule: Weekday[] };

/** Adds today's status, current streak and check-in count to each habit. */
async function withStats(habits: HabitRow[], today: CalendarDate): Promise<HabitSummary[]> {
  if (habits.length === 0) return [];

  const checkins = await db
    .selectFrom("habit_checkins")
    .select(["habit_id", "date"])
    .where("habit_id", "in", habits.map((h) => h.id))
    .where("date", "<=", today)
    .execute();

  const datesByHabit = new Map<string, CalendarDate[]>();
  for (const { habit_id, date } of checkins) {
    datesByHabit.set(habit_id, [...(datesByHabit.get(habit_id) ?? []), date]);
  }

  return habits.map((habit) => {
    const dates = datesByHabit.get(habit.id) ?? [];
    return {
      ...habit,
      doneToday: dates.includes(today),
      streak: currentStreak({ schedule: habit.schedule, checkins: dates, today }),
      totalCheckins: dates.length,
    };
  });
}

function activeHabits(userId: string) {
  return db
    .selectFrom("habits")
    .select(["id", "name", "schedule"])
    .where("user_id", "=", userId)
    .where("archived_at", "is", null)
    .orderBy("created_at")
    .execute();
}

/**
 * The user's active habits scheduled for `today` (in their timezone). Also
 * returns how many active habits they have in total, to tell "nothing today"
 * from "no habits yet".
 */
export async function getTodayHabits(userId: string, today: CalendarDate) {
  const habits = await activeHabits(userId);
  const weekday = weekdayOf(today);
  const scheduled = habits.filter((h) => h.schedule.includes(weekday));
  return { habits: await withStats(scheduled, today), activeCount: habits.length };
}

/** This week (Monday to Sunday) for Today's week strip: how many habits were done each day. */
export async function getHabitWeek(user: { id: string; timezone: string }, today: CalendarDate): Promise<WeekDay[]> {
  const habits = await db
    .selectFrom("habits")
    .select(["id", "schedule", "created_at"])
    .where("user_id", "=", user.id)
    .where("archived_at", "is", null)
    .execute();
  const checkins = habits.length
    ? await db
        .selectFrom("habit_checkins")
        .select(["habit_id", "date"])
        .where("habit_id", "in", habits.map((h) => h.id))
        .where("date", ">=", weekStart(today))
        .where("date", "<=", today)
        .execute()
    : [];
  return habitWeek(
    habits.map((h) => ({
      schedule: h.schedule,
      createdOn: todayIn(user.timezone, h.created_at), // the user's local date
      checkins: new Set(checkins.filter((c) => c.habit_id === h.id).map((c) => c.date)),
    })),
    today,
  );
}

/** Every habit for the Habits page: active ones with stats, plus the archived ones. */
export async function getHabitsOverview(userId: string, today: CalendarDate) {
  const [active, archived] = await Promise.all([
    activeHabits(userId),
    db
      .selectFrom("habits")
      .select(["id", "name"])
      .where("user_id", "=", userId)
      .where("archived_at", "is not", null)
      .orderBy("archived_at", "desc")
      .execute(),
  ]);
  return { active: await withStats(active, today), archived: archived as ArchivedHabit[] };
}
