import "server-only";
import { db } from "@/lib/db";
import { parseLesson } from "@/lib/lessons/queries";
import type { LessonContent } from "@/lib/lessons/schema";
import {
  collectMistakes,
  mistakesToReview,
  type Mistake,
  type MistakeAttempt,
  type MistakeDay,
  type PracticeResult,
} from "./collect";
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

/** Every answer the user gave, with its lesson and track, oldest first. */
function attemptsQuery(userId: string) {
  return db
    .selectFrom("attempts")
    .innerJoin("lessons", "lessons.id", "attempts.lesson_id")
    .innerJoin("track_days", "track_days.id", "lessons.track_day_id")
    .innerJoin("tracks", "tracks.id", "track_days.track_id")
    .select([
      "tracks.id as track_id",
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
    .where("tracks.user_id", "=", userId)
    .where("attempts.user_id", "=", userId)
    .orderBy("attempts.created_at")
    .orderBy("attempts.id");
}

type AttemptRow = Awaited<ReturnType<ReturnType<typeof attemptsQuery>["execute"]>>[number];

/**
 * Each track's mistakes, from its answers (in order) and its practice
 * results. Each lesson comes back once per answer: it's parsed once, and a
 * lesson that fails validation is left out, with its answers.
 */
function mistakesByTrack(rows: AttemptRow[], practice: PracticeResult[]): Map<string, Mistake[]> {
  const days = new Map<string, MistakeDay | null>();
  const byTrack = new Map<string, { days: MistakeDay[]; attempts: MistakeAttempt[] }>();
  for (const row of rows) {
    if (!days.has(row.lesson_id)) {
      const lesson: LessonContent | null = parseLesson(row.type, row.content);
      const day = lesson && { lessonId: row.lesson_id, dayNumber: row.day_number, dayTitle: row.day_title, lesson };
      days.set(row.lesson_id, day);
      if (day) {
        const track = byTrack.get(row.track_id) ?? { days: [], attempts: [] };
        track.days.push(day);
        byTrack.set(row.track_id, track);
      }
    }
    if (!days.get(row.lesson_id)) continue;
    byTrack.get(row.track_id)!.attempts.push({
      dayNumber: row.day_number,
      exerciseIndex: row.exercise_index,
      answer: row.answer,
      isCorrect: row.is_correct,
      feedback: row.feedback,
      betterVersion: row.better_version,
    });
  }
  return new Map([...byTrack].map(([trackId, t]) => [trackId, collectMistakes(t.days, t.attempts, practice)]));
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
    attemptsQuery(userId).where("tracks.id", "=", trackId).execute(),
    practiceQuery(userId)
      .innerJoin("lessons", "lessons.id", "practice_exercises.lesson_id")
      .innerJoin("track_days", "track_days.id", "lessons.track_day_id")
      .where("track_days.track_id", "=", trackId)
      .execute(),
  ]);
  if (!track) return undefined;

  const practice = practiceRows.map(toPractice).filter((p) => p !== null);
  const mistakes = mistakesByTrack(rows, practice.filter((p) => p.answered)).get(trackId) ?? [];
  return { track, mistakes, practice };
}

/**
 * How many mistakes each active track has left to review, for Today and
 * Week in review; tracks with none are left out. Only lessons with an answer
 * saved as wrong are loaded (every mistake has one), so this stays cheap
 * however many lessons the user has done.
 */
export async function getMistakeCounts(userId: string): Promise<{ trackId: string; trackTitle: string; count: number }[]> {
  const withWrongAnswers = db
    .selectFrom("attempts")
    .select("lesson_id")
    .where("user_id", "=", userId)
    .where("is_correct", "=", false);
  const [tracks, rows, fixed] = await Promise.all([
    db
      .selectFrom("tracks")
      .select(["id", "title"])
      .where("user_id", "=", userId)
      .where("status", "=", "active")
      .where("type", "!=", "reading")
      .orderBy("created_at")
      .execute(),
    attemptsQuery(userId)
      .where("tracks.status", "=", "active")
      .where("lessons.id", "in", withWrongAnswers)
      .execute(),
    db
      .selectFrom("practice_exercises")
      .select(["lesson_id", "exercise_index", "is_correct"])
      .where("user_id", "=", userId)
      .where("is_correct", "=", true)
      .execute(),
  ]);

  const mistakes = mistakesByTrack(
    rows,
    fixed.map((p) => ({ lessonId: p.lesson_id, exerciseIndex: p.exercise_index, isCorrect: p.is_correct })),
  );
  return tracks.flatMap((track) => {
    const count = mistakesToReview(mistakes.get(track.id) ?? []).length;
    return count > 0 ? [{ trackId: track.id, trackTitle: track.title, count }] : [];
  });
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
