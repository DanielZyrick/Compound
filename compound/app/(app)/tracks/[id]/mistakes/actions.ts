"use server";

import { refresh } from "next/cache";
import { sql } from "kysely";
import { z } from "zod";
import { AiError } from "@/lib/ai/errors";
import { runAiTask } from "@/lib/ai/run";
import { requireOnboardedUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { isCorrectChoice } from "@/lib/lessons/choices";
import { demoFeedback } from "@/lib/lessons/demo";
import { FEEDBACK_SYSTEM_PROMPT, feedbackPrompt, feedbackQuestion } from "@/lib/lessons/prompts";
import { feedbackSchema } from "@/lib/lessons/schema";
import {
  demoPractice,
  MAX_PRACTICE_PER_MISTAKE,
  PRACTICE_SYSTEM_PROMPT,
  practicePrompt,
  practiceSchema,
  practiceState,
} from "@/lib/mistakes/practice";
import { getMistake, getOwnedPractice } from "@/lib/mistakes/queries";

type Result = { errors: string[] };
const SOMETHING_WRONG = "Something went wrong. Please refresh and try again.";

const startSchema = z.object({ lessonId: z.uuid(), exerciseIndex: z.int().min(0) });

/**
 * "Practice this": the AI writes a fresh exercise for a mistake. If one is
 * already waiting for an answer, that one is kept instead (a partial unique
 * index makes a double click harmless too).
 */
export async function startPractice(input: unknown): Promise<Result> {
  const user = await requireOnboardedUser();
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return { errors: [SOMETHING_WRONG] };
  const { lessonId, exerciseIndex } = parsed.data;

  const found = await getMistake(user.id, lessonId, exerciseIndex);
  if (!found?.mistake) return { errors: [SOMETHING_WRONG] };
  const { track, exercise, mistake, practice } = found;

  const state = practiceState(practice);
  if (state === "fixed" || mistake.fixedLater) return { errors: ["You've already fixed this one."] };
  if (state === "used_up") {
    return { errors: [`You've had ${MAX_PRACTICE_PER_MISTAKE} practice exercises for this one. Try the lesson again.`] };
  }
  if (state === "waiting") {
    refresh(); // already written: just show it
    return { errors: [] };
  }

  const earlierQuestions = practice.map((p) => p.exercise.question);
  try {
    const { data, source } = await runAiTask({
      user,
      purpose: "practice",
      tier: "fast",
      schema: practiceSchema(exercise, earlierQuestions),
      system: PRACTICE_SYSTEM_PROMPT,
      prompt: practicePrompt({
        trackType: track.type,
        level: track.level,
        trackTitle: track.title,
        topic: track.topic,
        details: track.details,
        original: exercise,
        wrongAnswer: mistake.yourAnswer,
        earlierQuestions,
      }),
      demo: () => demoPractice(exercise, practice.length + 1),
    });

    await db
      .insertInto("practice_exercises")
      .values({
        user_id: user.id,
        lesson_id: lessonId,
        exercise_index: exerciseIndex,
        content: JSON.stringify(data.exercise),
        source,
      })
      .onConflict((oc) =>
        oc.columns(["user_id", "lesson_id", "exercise_index"]).where("answered_at", "is", null).doNothing(),
      )
      .execute();
  } catch (error) {
    if (error instanceof AiError) return { errors: [error.userMessage] };
    throw error;
  }

  refresh();
  return { errors: [] };
}

const choiceSchema = z.object({ practiceId: z.uuid(), choiceIndex: z.int().min(0) });

/** Grades a multiple-choice practice answer on the server (no AI). One answer each. */
export async function answerPracticeChoice(input: unknown): Promise<Result> {
  const user = await requireOnboardedUser();
  const parsed = choiceSchema.safeParse(input);
  if (!parsed.success) return { errors: [SOMETHING_WRONG] };
  const { practiceId, choiceIndex } = parsed.data;

  const practice = await getOwnedPractice(user.id, practiceId);
  const exercise = practice?.exercise;
  if (!exercise || exercise.type !== "multiple_choice" || choiceIndex >= exercise.choices.length) {
    return { errors: [SOMETHING_WRONG] };
  }

  // Only the first answer counts: the update skips one already answered.
  await db
    .updateTable("practice_exercises")
    .set({
      answer: String(choiceIndex),
      is_correct: isCorrectChoice(exercise.choices, choiceIndex, exercise.answerIndex),
      feedback: exercise.explanation,
      answered_at: sql`now()`,
    })
    .where("id", "=", practiceId)
    .where("user_id", "=", user.id)
    .where("answered_at", "is", null)
    .execute();

  refresh();
  return { errors: [] };
}

const openAnswerSchema = z.object({
  practiceId: z.uuid(),
  answer: z
    .string()
    .trim()
    .min(3, { error: "Write an answer first (at least a few words)." })
    .max(2000, { error: "Keep your answer under 2,000 characters." }),
});

/** Sends an open practice answer to the AI for feedback. One answer each. */
export async function submitPracticeAnswer(input: unknown): Promise<Result> {
  const user = await requireOnboardedUser();
  const parsed = openAnswerSchema.safeParse(input);
  if (!parsed.success) return { errors: [...new Set(parsed.error.issues.map((i) => i.message))] };
  const { practiceId, answer } = parsed.data;

  const practice = await getOwnedPractice(user.id, practiceId);
  const exercise = practice?.exercise;
  if (!practice || !exercise || exercise.type !== "open") return { errors: [SOMETHING_WRONG] };
  if (practice.answered) {
    refresh();
    return { errors: [] };
  }

  try {
    const { data, source } = await runAiTask({
      user,
      purpose: "feedback",
      tier: "fast",
      schema: feedbackSchema,
      system: FEEDBACK_SYSTEM_PROMPT,
      prompt: feedbackPrompt({
        type: practice.trackType,
        level: practice.level,
        question: feedbackQuestion(exercise),
        reference: exercise.sampleAnswer,
        answer,
      }),
      effort: "low",
      demo: () => demoFeedback(exercise.sampleAnswer),
    });

    await db
      .updateTable("practice_exercises")
      .set({
        answer,
        is_correct: source === "demo" ? null : data.isCorrect, // demo answers aren't graded
        feedback: data.feedback,
        better_version: data.betterVersion,
        answered_at: sql`now()`,
      })
      .where("id", "=", practiceId)
      .where("user_id", "=", user.id)
      .where("answered_at", "is", null)
      .execute();
  } catch (error) {
    if (error instanceof AiError) return { errors: [error.userMessage] };
    throw error;
  }

  refresh();
  return { errors: [] };
}
