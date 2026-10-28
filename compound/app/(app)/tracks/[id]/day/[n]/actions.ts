"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { AiError } from "@/lib/ai/errors";
import { runAiTask } from "@/lib/ai/run";
import { requireOnboardedUser } from "@/lib/auth/dal";
import { todayIn } from "@/lib/dates/calendar";
import { db } from "@/lib/db";
import { demoFeedback, demoLesson } from "@/lib/lessons/demo";
import { FEEDBACK_SYSTEM_PROMPT, feedbackPrompt, LESSON_SYSTEM_PROMPT, lessonPrompt } from "@/lib/lessons/prompts";
import { getOwnedLesson, parseLesson } from "@/lib/lessons/queries";
import { canComplete, isDayOpen, MAX_FEEDBACK_PER_EXERCISE, shouldCheckHabit } from "@/lib/lessons/rules";
import { feedbackSchema, lessonSchema } from "@/lib/lessons/schema";
import { currentTrackDay } from "@/lib/tracks/progress";

type Result = { errors: string[] };
const SOMETHING_WRONG = "Something went wrong. Please refresh and try again.";

const startSchema = z.object({ trackId: z.uuid(), dayNumber: z.int().min(1) });

/**
 * Writes the lesson for a day the first time it's started. A lesson is never
 * regenerated: if one exists (or another tab wins the race), it's kept.
 */
export async function startLesson(input: unknown): Promise<Result> {
  const user = await requireOnboardedUser();
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return { errors: [SOMETHING_WRONG] };
  const { trackId, dayNumber } = parsed.data;

  const track = await db
    .selectFrom("tracks")
    .select(["title", "topic", "type", "level", "total_days", "start_date"])
    .where("id", "=", trackId)
    .where("user_id", "=", user.id)
    .executeTakeFirst();
  if (!track || track.type === "reading") return { errors: [SOMETHING_WRONG] };

  const today = todayIn(user.timezone);
  if (!isDayOpen(dayNumber, currentTrackDay(track.start_date, today, track.total_days))) {
    return { errors: ["This day isn't open yet."] };
  }

  const days = await db
    .selectFrom("track_days")
    .leftJoin("lessons", "lessons.track_day_id", "track_days.id")
    .select(["track_days.id", "track_days.day_number", "track_days.title", "track_days.summary", "lessons.id as lessonId"])
    .where("track_days.track_id", "=", trackId)
    .where("track_days.day_number", "<=", dayNumber)
    .orderBy("track_days.day_number")
    .execute();
  const day = days.find((d) => d.day_number === dayNumber);
  if (!day) return { errors: [SOMETHING_WRONG] };
  if (day.lessonId) {
    refresh(); // already written: just show it
    return { errors: [] };
  }

  const lessonInput = { type: track.type, topic: track.topic, dayTitle: day.title, daySummary: day.summary };
  try {
    const { data, source } = await runAiTask({
      user,
      purpose: "lesson",
      tier: "smart",
      schema: lessonSchema(track.type),
      system: LESSON_SYSTEM_PROMPT,
      prompt: lessonPrompt({
        trackTitle: track.title,
        topic: track.topic,
        type: track.type,
        level: track.level,
        dayNumber,
        totalDays: track.total_days,
        dayTitle: day.title,
        daySummary: day.summary,
        earlierDays: days.filter((d) => d.day_number < dayNumber).map((d) => d.title),
      }),
      demo: () => demoLesson(lessonInput),
    });

    await db
      .insertInto("lessons")
      .values({ track_day_id: day.id, content: JSON.stringify(data), source })
      .onConflict((oc) => oc.column("track_day_id").doNothing())
      .execute();
  } catch (error) {
    if (error instanceof AiError) return { errors: [error.userMessage] };
    throw error;
  }

  refresh();
  return { errors: [] };
}

const choiceSchema = z.object({ lessonId: z.uuid(), exerciseIndex: z.int().min(0), choiceIndex: z.int().min(0) });

/** Grades a multiple-choice answer on the server (no AI). One answer per exercise. */
export async function answerMultipleChoice(input: unknown): Promise<Result> {
  const user = await requireOnboardedUser();
  const parsed = choiceSchema.safeParse(input);
  if (!parsed.success) return { errors: [SOMETHING_WRONG] };
  const { lessonId, exerciseIndex, choiceIndex } = parsed.data;

  const lesson = await getOwnedLesson(user.id, lessonId);
  const exercise = lesson?.content.exercises[exerciseIndex];
  if (!exercise || exercise.type !== "multiple_choice" || choiceIndex >= exercise.choices.length) {
    return { errors: [SOMETHING_WRONG] };
  }

  const existing = await db
    .selectFrom("attempts")
    .select("id")
    .where("lesson_id", "=", lessonId)
    .where("user_id", "=", user.id)
    .where("exercise_index", "=", exerciseIndex)
    .executeTakeFirst();
  if (!existing) {
    await db
      .insertInto("attempts")
      .values({
        lesson_id: lessonId,
        user_id: user.id,
        exercise_index: exerciseIndex,
        answer: String(choiceIndex),
        is_correct: choiceIndex === exercise.answerIndex,
        feedback: exercise.explanation,
        better_version: null,
        source: "auto",
      })
      .execute();
  }

  refresh();
  return { errors: [] };
}

const openAnswerSchema = z.object({
  lessonId: z.uuid(),
  exerciseIndex: z.int().min(0),
  answer: z
    .string()
    .trim()
    .min(3, { error: "Write an answer first (at least a few words)." })
    .max(2000, { error: "Keep your answer under 2,000 characters." }),
});

/** Sends an open answer to the AI for feedback (up to 3 times per exercise). */
export async function submitOpenAnswer(input: unknown): Promise<Result> {
  const user = await requireOnboardedUser();
  const parsed = openAnswerSchema.safeParse(input);
  if (!parsed.success) return { errors: [...new Set(parsed.error.issues.map((i) => i.message))] };
  const { lessonId, exerciseIndex, answer } = parsed.data;

  const lesson = await getOwnedLesson(user.id, lessonId);
  const exercise = lesson?.content.exercises[exerciseIndex];
  if (!lesson || !exercise || exercise.type !== "open" || lesson.type === "reading") {
    return { errors: [SOMETHING_WRONG] };
  }

  const previous = await db
    .selectFrom("attempts")
    .select("id")
    .where("lesson_id", "=", lessonId)
    .where("user_id", "=", user.id)
    .where("exercise_index", "=", exerciseIndex)
    .execute();
  if (previous.length >= MAX_FEEDBACK_PER_EXERCISE) {
    return { errors: [`You've used all ${MAX_FEEDBACK_PER_EXERCISE} reviews for this exercise.`] };
  }

  try {
    const { data, source } = await runAiTask({
      user,
      purpose: "feedback",
      tier: "fast",
      schema: feedbackSchema,
      system: FEEDBACK_SYSTEM_PROMPT,
      prompt: feedbackPrompt({
        type: lesson.type,
        level: lesson.level,
        question: exercise.question,
        reference: exercise.sampleAnswer,
        answer,
      }),
      effort: "low",
      demo: () => demoFeedback(exercise.sampleAnswer),
    });

    await db
      .insertInto("attempts")
      .values({
        lesson_id: lessonId,
        user_id: user.id,
        exercise_index: exerciseIndex,
        answer,
        is_correct: source === "demo" ? null : data.isCorrect, // demo answers aren't graded
        feedback: data.feedback,
        better_version: data.betterVersion,
        source,
      })
      .execute();
  } catch (error) {
    if (error instanceof AiError) return { errors: [error.userMessage] };
    throw error;
  }

  refresh();
  return { errors: [] };
}

/**
 * Marks a day's lesson as done once every exercise has an attempt, checks
 * off the track's habit for today (if it's active and scheduled), and marks
 * the track completed when its last day is done.
 */
export async function completeLesson(input: unknown): Promise<Result> {
  const user = await requireOnboardedUser();
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return { errors: [SOMETHING_WRONG] };
  const { trackId, dayNumber } = parsed.data;

  const row = await db
    .selectFrom("track_days")
    .innerJoin("tracks", "tracks.id", "track_days.track_id")
    .innerJoin("lessons", "lessons.track_day_id", "track_days.id")
    .select([
      "track_days.id as dayId",
      "track_days.completed_at",
      "lessons.id as lessonId",
      "lessons.content",
      "tracks.type",
      "tracks.habit_id",
    ])
    .where("tracks.id", "=", trackId)
    .where("tracks.user_id", "=", user.id)
    .where("track_days.day_number", "=", dayNumber)
    .executeTakeFirst();
  const content = row ? parseLesson(row.type, row.content) : null;
  if (!row || !content) return { errors: [SOMETHING_WRONG] };
  if (row.completed_at) return { errors: [] }; // already done

  const attempted = await db
    .selectFrom("attempts")
    .select("exercise_index")
    .where("lesson_id", "=", row.lessonId)
    .where("user_id", "=", user.id)
    .execute();
  if (!canComplete(content.exercises.length, attempted.map((a) => a.exercise_index))) {
    return { errors: ["Answer every exercise first."] };
  }

  const today = todayIn(user.timezone);
  await db.transaction().execute(async (trx) => {
    await trx
      .updateTable("track_days")
      .set({ completed_at: new Date() })
      .where("id", "=", row.dayId)
      .where("completed_at", "is", null)
      .execute();

    if (row.habit_id) {
      const habit = await trx
        .selectFrom("habits")
        .select(["archived_at", "schedule"])
        .where("id", "=", row.habit_id)
        .executeTakeFirst();
      const check = habit ? { archived: habit.archived_at !== null, schedule: habit.schedule } : null;
      if (shouldCheckHabit(check, today)) {
        await trx
          .insertInto("habit_checkins")
          .values({ habit_id: row.habit_id, date: today })
          .onConflict((oc) => oc.columns(["habit_id", "date"]).doNothing())
          .execute();
      }
    }

    // The whole track is done when no day is left unfinished.
    const remaining = await trx
      .selectFrom("track_days")
      .select("id")
      .where("track_id", "=", trackId)
      .where("completed_at", "is", null)
      .executeTakeFirst();
    if (!remaining) {
      await trx.updateTable("tracks").set({ status: "completed" }).where("id", "=", trackId).execute();
    }
  });

  refresh();
  return { errors: [] };
}
