import "server-only";
import { addDays, todayIn } from "@/lib/dates/calendar";
import { db } from "@/lib/db";
import type { CalendarDate, Weekday } from "@/lib/db/types";
import { bestStreak, currentStreak } from "@/lib/habits/streaks";
import { checkinGrid, type GridDay } from "./grid";

const GRID_DAYS = 30;

export type HabitProgress = {
  id: string;
  name: string;
  schedule: Weekday[];
  current: number;
  best: number;
  grid: GridDay[];
};

/** Everything the Progress page shows, computed from the raw records. */
export async function getProgress(user: { id: string; timezone: string }) {
  const today = todayIn(user.timezone);

  const [habitRows, trackRows, attemptRows, reflectionCount, principleReflections] = await Promise.all([
    db
      .selectFrom("habits")
      .select(["id", "name", "schedule", "created_at"])
      .where("user_id", "=", user.id)
      .where("archived_at", "is", null)
      .orderBy("created_at")
      .execute(),
    db
      .selectFrom("tracks")
      .leftJoin("track_days", "track_days.track_id", "tracks.id")
      .select((eb) => [
        "tracks.id",
        "tracks.title",
        "tracks.type",
        "tracks.status",
        "tracks.total_days",
        eb.fn.count<string>("track_days.completed_at").as("doneDays"),
      ])
      .where("tracks.user_id", "=", user.id)
      .where("tracks.status", "!=", "archived")
      .groupBy("tracks.id")
      .orderBy("tracks.created_at", "desc")
      .execute(),
    db
      .selectFrom("attempts")
      .select(["source", "is_correct"])
      .where("user_id", "=", user.id)
      .execute(),
    db
      .selectFrom("reflections")
      .select((eb) => eb.fn.countAll<string>().as("count"))
      .where("user_id", "=", user.id)
      .executeTakeFirstOrThrow(),
    db
      .selectFrom("daily_principles")
      .select((eb) => eb.fn.countAll<string>().as("count"))
      .where("user_id", "=", user.id)
      .where("reflection", "is not", null)
      .executeTakeFirstOrThrow(),
  ]);

  const checkins = habitRows.length
    ? await db
        .selectFrom("habit_checkins")
        .select(["habit_id", "date"])
        .where("habit_id", "in", habitRows.map((h) => h.id))
        .where("date", "<=", today)
        .execute()
    : [];
  const datesByHabit = new Map<string, CalendarDate[]>();
  for (const { habit_id, date } of checkins) {
    datesByHabit.set(habit_id, [...(datesByHabit.get(habit_id) ?? []), date]);
  }

  const habits: HabitProgress[] = habitRows.map((h) => {
    const dates = datesByHabit.get(h.id) ?? [];
    return {
      id: h.id,
      name: h.name,
      schedule: h.schedule,
      current: currentStreak({ schedule: h.schedule, checkins: dates, today }),
      best: bestStreak({ schedule: h.schedule, checkins: dates }),
      grid: checkinGrid({
        schedule: h.schedule,
        checkins: new Set(dates),
        createdOn: todayIn(user.timezone, h.created_at), // the user's local date
        today,
        days: GRID_DAYS,
      }),
    };
  });

  const windowStart = addDays(today, -(GRID_DAYS - 1));
  const tracks = trackRows.map((t) => ({ ...t, doneDays: Number(t.doneDays) }));
  const multipleChoice = attemptRows.filter((a) => a.source === "auto");
  const longest = habits.reduce<HabitProgress | null>((top, h) => (!top || h.current > top.current ? h : top), null);

  return {
    habits,
    tracks,
    stats: {
      checkins30: checkins.filter((c) => c.date >= windowStart).length,
      longestCurrent: longest && longest.current > 0 ? { days: longest.current, habit: longest.name } : null,
      lessonsDone: tracks.filter((t) => t.type !== "reading").reduce((sum, t) => sum + t.doneDays, 0),
      readingsDone: tracks.filter((t) => t.type === "reading").reduce((sum, t) => sum + t.doneDays, 0),
      // Reading reflections plus reflections on the principle of the day.
      reflections: Number(reflectionCount.count) + Number(principleReflections.count),
      multipleChoice: {
        correct: multipleChoice.filter((a) => a.is_correct).length,
        total: multipleChoice.length,
      },
      openReviews: attemptRows.filter((a) => a.source === "ai").length,
    },
  };
}

export type Progress = Awaited<ReturnType<typeof getProgress>>;
