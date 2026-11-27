import "server-only";
import { db } from "@/lib/db";
import { parseLesson } from "@/lib/lessons/queries";
import type { LessonContent } from "@/lib/lessons/schema";
import { collectMistakes, type MistakeAttempt, type MistakeDay } from "./collect";
import { parsePractice } from "./practice";

/** Practice rows as the mistakes page and the actions read them, oldest first. */
function practiceQuery(userId: string) {
  return db
    .selectFrom("practice_exercises")
    .select([
      "practice_exercises.id",
      "practice_exercises.lesson_id",
      "practice_exercises.exercise_index",
      "practice_exercises.content",
      "practice_exercises.source",
      "practice_exercises.answer",
      "practice_exercises.is_correct",
      "practice_exercises.feedback",
      "practice_exercises.better_version",
      "practice_exercises.answered_at",
    ])
    .where("practice_exercises.user_id", "=", userId)
    .orderBy("practice_exercises.created_at")
    .orderBy("practice_exercises.id");
}

/** A practice exercise that passed validation, with its answer if given. */
export type PracticeRow = NonNullable<ReturnType<typeof toPractice>>;

function toPractice(row: Awaited<ReturnType<ReturnType<typeof practiceQuery>["execute"]>>[number]) {
  const exercise = parsePractice(row.content);
  if (!exercise) return null;
  return {
    id: row.id,
    lessonId: row.lesson_id,
    exerciseIndex: row.exercise_index,
    exercise,
    source: row.source,
    answer: row.answer,
    isCorrect: row.is_correct,
    feedback: row.feedback,
    betterVersion: row.better_version,
    answered: row.answered_at !== null,
    answeredAt: row.answered_at,
  };
}

/**
 * A track's mistakes and their practice exercises, or undefined if it isn't
 * the user's track. Three queries side by side: the track, every answer the
 * user gave in it with its lesson, and the practice exercises.
 */
export async function getTrackMistakes(userId: string, trackId: string) {
  const [track, rows, practiceRows] = await Promise.all([
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
    practiceQuery(userId)
      .innerJoin("lessons", "lessons.id", "practice_exercises.lesson_id")
      .innerJoin("track_days", "track_days.id", "lessons.track_day_id")
      .where("track_days.track_id", "=", trackId)
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
      days.set(row.lesson_id, lesson && { lessonId: row.lesson_id, dayNumber: row.day_number, dayTitle: row.day_title, lesson });
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

  const practice = practiceRows.map(toPractice).filter((p) => p !== null);
  const mistakes = collectMistakes(
    [...days.values()].filter((d) => d !== null),
    attempts,
    practice.filter((p) => p.answered),
  );
  return { track, mistakes, practice };
}

/**
 * One mistake, for the practice actions: the lesson and its track (for the
 * prompt), the mistake itself (undefined if that exercise wasn't one), and
 * its practice exercises so far. Undefined if the lesson isn't the user's.
 */
export async function getMistake(userId: string, lessonId: string, exerciseIndex: number) {
  const [lessonRow, attemptRows, practiceRows] = await Promise.all([
    db
      .selectFrom("lessons")
      .innerJoin("track_days", "track_days.id", "lessons.track_day_id")
      .innerJoin("tracks", "tracks.id", "track_days.track_id")
      .select([
        "lessons.content",
        "track_days.day_number",
        "track_days.title as day_title",
        "tracks.id as track_id",
        "tracks.title",
        "tracks.topic",
        "tracks.type",
        "tracks.level",
        "tracks.details",
      ])
      .where("lessons.id", "=", lessonId)
      .where("tracks.user_id", "=", userId)
      .executeTakeFirst(),
    db
      .selectFrom("attempts")
      .select(["answer", "is_correct", "feedback", "better_version"])
      .where("lesson_id", "=", lessonId)
      .where("user_id", "=", userId)
      .where("exercise_index", "=", exerciseIndex)
      .orderBy("created_at")
      .orderBy("id")
      .execute(),
    practiceQuery(userId)
      .where("practice_exercises.lesson_id", "=", lessonId)
      .where("practice_exercises.exercise_index", "=", exerciseIndex)
      .execute(),
  ]);
  if (!lessonRow) return undefined;
  const lesson = parseLesson(lessonRow.type, lessonRow.content);
  const exercise = lesson?.exercises[exerciseIndex];
  if (!lesson || !exercise || lessonRow.type === "reading" || !lessonRow.level) return undefined;

  const [mistake] = collectMistakes(
    [{ lessonId, dayNumber: lessonRow.day_number, dayTitle: lessonRow.day_title, lesson }],
    attemptRows.map((a) => ({
      dayNumber: lessonRow.day_number,
      exerciseIndex,
      answer: a.answer,
      isCorrect: a.is_correct,
      feedback: a.feedback,
      betterVersion: a.better_version,
    })),
  ).filter((m) => m.exerciseIndex === exerciseIndex);

  return {
    track: {
      id: lessonRow.track_id,
      title: lessonRow.title,
      topic: lessonRow.topic,
      type: lessonRow.type,
      level: lessonRow.level,
      details: lessonRow.details,
    },
    exercise,
    mistake,
    practice: practiceRows.map(toPractice).filter((p) => p !== null),
  };
}

/** A practice exercise the user owns, with its track's type and level (for feedback). */
export async function getOwnedPractice(userId: string, practiceId: string) {
  const row = await practiceQuery(userId)
    .innerJoin("lessons", "lessons.id", "practice_exercises.lesson_id")
    .innerJoin("track_days", "track_days.id", "lessons.track_day_id")
    .innerJoin("tracks", "tracks.id", "track_days.track_id")
    .select(["tracks.id as track_id", "tracks.type", "tracks.level"])
    .where("practice_exercises.id", "=", practiceId)
    .executeTakeFirst();
  if (!row) return undefined;
  const practice = toPractice(row);
  if (!practice || row.type === "reading" || !row.level) return undefined;
  return { ...practice, trackId: row.track_id, trackType: row.type, level: row.level };
}
