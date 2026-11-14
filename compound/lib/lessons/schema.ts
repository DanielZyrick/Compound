import { z } from "zod";
import type { TrackType } from "@/lib/db/types";

// A daily lesson: a short explanation plus 3 exercises. This is what the AI
// must return, what's stored in lessons.content, and what's checked again
// every time a lesson is read from the database.

/** One code example: the code, what to call it, and what it prints or does. */
export const codeBlockSchema = z.object({
  language: z
    .string()
    .trim()
    .min(1)
    .max(30)
    .describe('Lowercase language id, e.g. "python", "typescript", "sql", "bash". Use "text" if it is not code.'),
  filename: z.string().trim().max(60).nullable().describe("A file name to show above the code, or null"),
  code: z.string().min(1).max(1500),
  output: z
    .string()
    .max(800)
    .nullable()
    .describe("Exactly what running the code prints. null if it prints nothing, or if you are not certain."),
  result: z
    .string()
    .trim()
    .max(200)
    .nullable()
    .describe("Only when output is null: one sentence on what the code does or produces. Otherwise null."),
});

export type CodeBlockContent = z.infer<typeof codeBlockSchema>;

const sectionSchema = z.object({
  heading: z.string().trim().min(2).max(80),
  paragraphs: z.array(z.string().trim().min(1).max(800)).min(1).max(4),
  blocks: z.array(codeBlockSchema).max(3).describe("Code examples for this section, in order; empty if none"),
});

const multipleChoiceSchema = z.object({
  type: z.literal("multiple_choice"),
  question: z.string().trim().min(5).max(300),
  choices: z.array(z.string().trim().min(1).max(160)).min(3).max(4),
  answerIndex: z.int().min(0).max(3).describe("0-based index of the one correct choice"),
  explanation: z.string().trim().min(10).max(400).describe("Why the correct choice is right"),
});

const openSchema = z.object({
  type: z.literal("open"),
  question: z.string().trim().min(5).max(500),
  hint: z.string().trim().max(200).nullable(),
  sampleAnswer: z.string().trim().min(10).max(800).describe("A strong example answer"),
});

const exerciseSchema = z.discriminatedUnion("type", [multipleChoiceSchema, openSchema]);

/** The order of exercise types for each kind of track. */
export const EXERCISE_MIX: Record<Exclude<TrackType, "reading">, Exercise["type"][]> = {
  skill: ["multiple_choice", "multiple_choice", "open"],
  thinking: ["multiple_choice", "open", "open"],
};

export function lessonSchema(trackType: Exclude<TrackType, "reading">) {
  const mix = EXERCISE_MIX[trackType];
  return z
    .object({
      title: z.string().trim().min(3).max(90),
      minutes: z.int().min(5).max(20).describe("Estimated minutes to finish"),
      sections: z.array(sectionSchema).min(2).max(4),
      exercises: z.array(exerciseSchema).length(mix.length),
    })
    .refine((lesson) => lesson.exercises.every((e, i) => e.type === mix[i]), {
      error: `Exercises must be, in order: ${mix.join(", ")}.`,
    })
    .refine(
      (lesson) =>
        lesson.exercises.every((e) => e.type !== "multiple_choice" || e.answerIndex < e.choices.length),
      { error: "answerIndex must point to one of the choices." },
    );
}

export type LessonContent = z.infer<ReturnType<typeof lessonSchema>>;

/**
 * Lessons saved before code blocks had a language and output kept one plain
 * `code` string per section. This rewrites that shape into `blocks`, so old
 * lessons still open (without output, which was never written for them).
 * Anything else is returned as it is, for the schema to judge.
 */
export function upgradeLesson(content: unknown): unknown {
  if (typeof content !== "object" || content === null) return content;
  const lesson = content as { sections?: unknown };
  if (!Array.isArray(lesson.sections)) return content;
  return {
    ...lesson,
    sections: lesson.sections.map((section: unknown) => {
      if (typeof section !== "object" || section === null || "blocks" in section) return section;
      const { code, ...rest } = section as { code?: unknown };
      const blocks =
        typeof code === "string" && code.trim() !== ""
          ? [{ language: "text", filename: null, code, output: null, result: null }]
          : [];
      return { ...rest, blocks };
    }),
  };
}
export type Exercise = z.infer<typeof exerciseSchema>;

/**
 * The lesson as the browser may see it: no correct answers, explanations or
 * sample answers. Those are only revealed by the server after an attempt.
 */
export function toPublicLesson(lesson: LessonContent) {
  return {
    ...lesson,
    exercises: lesson.exercises.map((e) =>
      e.type === "multiple_choice"
        ? { type: e.type, question: e.question, choices: e.choices }
        : { type: e.type, question: e.question, hint: e.hint },
    ),
  };
}

export type PublicLesson = ReturnType<typeof toPublicLesson>;
export type PublicExercise = PublicLesson["exercises"][number];

/** What the AI returns when it reviews an open answer. */
export const feedbackSchema = z.object({
  isCorrect: z.boolean(),
  feedback: z.string().trim().min(10).max(800).describe("Specific, encouraging feedback"),
  betterVersion: z
    .string()
    .trim()
    .min(1)
    .max(1200)
    .describe("An improved version of the learner's own answer"),
});

export type Feedback = z.infer<typeof feedbackSchema>;
