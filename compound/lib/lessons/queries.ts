import "server-only";
import { db } from "@/lib/db";
import type { CalendarDate } from "@/lib/db/types";
import { todayIn } from "@/lib/dates/calendar";
import { completedDayNumbers } from "@/lib/tracks/queries";
import { currentTrackDay, nextTrackDay } from "@/lib/tracks/progress";
import { lessonSchema, type LessonContent } from "./schema";

/** Reads stored lesson JSON, validating it again. Bad data is treated as missing. */
export function parseLesson(type: string, content: unknown): LessonContent | null {
  if (type !== "skill" && type !== "thinking") return null;
  const parsed = lessonSchema(type).safeParse(content);
  if (!parsed.success) {
    console.error("[lessons] stored lesson failed validation:", parsed.error.message);
    return null;
  }
  return parsed.data;
}

/** Everything the lesson page needs, or undefined if it isn't the user's track or day. */
export async function getLessonPage(userId: string, trackId: string, dayNumber: number, today: CalendarDate) {
  const row = await db
    .selectFrom("track_days")
    .innerJoin("tracks", "tracks.id", "track_days.track_id")
    .leftJoin("lessons", "lessons.track_day_id", "track_days.id")
    .select([
      "tracks.title as trackTitle",
      "tracks.type",
      "tracks.level",
      "tracks.total_days",
      "tracks.start_date",
      "tracks.habit_id",
      "tracks.id as trackId",
      "track_days.id as dayId",
      "track_days.title",
      "track_days.summary",
      "track_days.completed_at",
      "lessons.id as lessonId",
      "lessons.content",
      "lessons.source",
    ])
    .where("tracks.id", "=", trackId)
    .where("tracks.user_id", "=", userId)
    .where("track_days.day_number", "=", dayNumber)
    .executeTakeFirst();
  if (!row) return undefined;

  const lesson = row.lessonId ? parseLesson(row.type, row.content) : null;
  const completedDays = await completedDayNumbers(row.trackId);
  const attempts = row.lessonId
    ? await db
        .selectFrom("attempts")
        .select(["exercise_index", "answer", "is_correct", "feedback", "better_version", "source", "created_at"])
        .where("lesson_id", "=", row.lessonId)
        .where("user_id", "=", userId)
        .orderBy("created_at")
        .execute()
    : [];

  return {
    ...row,
    lesson,
    attempts,
    completedDays,
    calendarDay: currentTrackDay(row.start_date, today, row.total_days),
  };
}

export type LessonAttempt = NonNullable<Awaited<ReturnType<typeof getLessonPage>>>["attempts"][number];

/** A lesson the user owns, with its track's type and level, for the answer actions. */
export async function getOwnedLesson(userId: string, lessonId: string) {
  const row = await db
    .selectFrom("lessons")
    .innerJoin("track_days", "track_days.id", "lessons.track_day_id")
    .innerJoin("tracks", "tracks.id", "track_days.track_id")
    .select(["lessons.id", "lessons.content", "tracks.type", "tracks.level", "tracks.status"])
    .where("lessons.id", "=", lessonId)
    .where("tracks.user_id", "=", userId)
    .executeTakeFirst();
  if (!row) return undefined;
  const content = parseLesson(row.type, row.content);
  return content ? { ...row, content } : undefined;
}

/**
 * For the Today page: each active track's step (a lesson, or a reading for
 * reading tracks). If one was finished today, that one, marked done, with the
 * next day to keep going with. Otherwise the first day not done yet: days
 * open early once the one before is done, so that's always open.
 */
export async function getTodayLessons(user: { id: string; timezone: string }, today: CalendarDate) {
  const tracks = await db
    .selectFrom("tracks")
    .select(["id", "title", "type", "total_days"])
    .where("user_id", "=", user.id)
    .where("status", "=", "active")
    .orderBy("created_at")
    .execute();
  if (tracks.length === 0) return [];

  const days = await db
    .selectFrom("track_days")
    .select(["track_id", "day_number", "title", "completed_at"])
    .where("track_id", "in", tracks.map((t) => t.id))
    .execute();

  return tracks.flatMap((track) => {
    const own = days.filter((d) => d.track_id === track.id);
    const completed = new Set(own.filter((d) => d.completed_at !== null).map((d) => d.day_number));
    const next = nextTrackDay(track.total_days, completed);
    // The latest day finished today, in the user's timezone.
    const doneToday = own
      .filter((d) => d.completed_at !== null && todayIn(user.timezone, d.completed_at) === today)
      .sort((a, b) => b.day_number - a.day_number)[0];
    const day = doneToday ?? own.find((d) => d.day_number === next);
    if (!day) return [];
    return [
      {
        trackId: track.id,
        trackTitle: track.title,
        reading: track.type === "reading",
        dayNumber: day.day_number,
        totalDays: track.total_days,
        dayTitle: day.title,
        done: day.completed_at !== null,
        keepGoing: doneToday && next !== null ? next : null,
      },
    ];
  });
}

/** The user's reflection for a reading-track day, or null. */
export async function getReflection(userId: string, trackDayId: string): Promise<string | null> {
  const row = await db
    .selectFrom("reflections")
    .select("text")
    .where("user_id", "=", userId)
    .where("track_day_id", "=", trackDayId)
    .executeTakeFirst();
  return row?.text ?? null;
}
