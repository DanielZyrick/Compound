import "server-only";
import { db } from "@/lib/db";
import { parseLesson } from "@/lib/lessons/queries";
import type { LessonContent } from "@/lib/lessons/schema";
import { collectMistakes, type MistakeAttempt, type MistakeDay } from "./collect";

/**
 * A track's mistakes, or undefined if it isn't the user's track. Two queries
 * side by side: the track itself, and every answer the user gave in it with
 * the lesson it belongs to.
 */
export async function getTrackMistakes(userId: string, trackId: string) {
  const [track, rows] = await Promise.all([
    db
      .selectFrom("tracks")
      .select(["id", "title", "type", "status"])
      .where("id", "=", trackId)
      .where("user_id", "=", userId)
      .executeTakeFirst(),
    db
      .selectFrom("attempts")
      .innerJoin("lessons", "lessons.id", "attempts.lesson_id")
      .innerJoin("track_days", "track_days.id", "lessons.track_day_id")
      .innerJoin("tracks", "tracks.id", "track_days.track_id")
      .select([
        "tracks.type",
        "track_days.day_number",
        "track_days.title as day_title",
        "lessons.id as lesson_id",
        "lessons.content",
        "attempts.exercise_index",
        "attempts.answer",
        "attempts.is_correct",
        "attempts.feedback",
        "attempts.better_version",
      ])
      .where("tracks.id", "=", trackId)
      .where("tracks.user_id", "=", userId)
      .where("attempts.user_id", "=", userId)
      .orderBy("attempts.created_at")
      .orderBy("attempts.id")
      .execute(),
  ]);
  if (!track) return undefined;

  // Each lesson comes back once per answer: parse it once. A lesson that
  // fails validation is left out, with its answers.
  const days = new Map<string, MistakeDay | null>();
  const attempts: MistakeAttempt[] = [];
  for (const row of rows) {
    if (!days.has(row.lesson_id)) {
      const lesson: LessonContent | null = parseLesson(row.type, row.content);
      days.set(row.lesson_id, lesson && { dayNumber: row.day_number, dayTitle: row.day_title, lesson });
    }
    if (!days.get(row.lesson_id)) continue;
    attempts.push({
      dayNumber: row.day_number,
      exerciseIndex: row.exercise_index,
      answer: row.answer,
      isCorrect: row.is_correct,
      feedback: row.feedback,
      betterVersion: row.better_version,
    });
  }

  return { track, mistakes: collectMistakes([...days.values()].filter((d) => d !== null), attempts) };
}
