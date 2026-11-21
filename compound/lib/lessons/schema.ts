import { z } from "zod";
import type { TrackType } from "@/lib/db/types";
import { hasLookalikeChoices, isAnswerableSample } from "./choices";

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

const figureText = z.string().trim().min(1).max(90);

/**
 * A small diagram. The AI never draws: it picks a kind and writes the labels,
 * and the app draws it (components/lesson-figure.tsx).
 *
 * All three kinds share one flat shape, a grid of text. A union with one
 * shape per kind reads better, but the API rejects it: added to the rest of
 * the lesson, its grammar is too large for structured outputs.
 *
 *   steps    headers: []                each row: [label] or [label, note]
 *   compare  headers: [left, right]     each row: [left point, right point]
 *   table    headers: the column names  each row: one cell per column
 */
export const figureSchema = z
  .object({
    kind: z.enum(["steps", "compare", "table"]),
    caption: z.string().trim().min(3).max(120).describe("One short line saying what the diagram shows"),
    headers: z
      .array(figureText)
      .max(4)
      .describe("steps: empty. compare: the names of the two things. table: the column names."),
    rows: z
      .array(z.array(figureText).min(1).max(4))
      .min(1)
      .max(6)
      .describe(
        "steps: one row per step, a short label then an optional note. compare: one row per aspect, the left thing's point then the right thing's. table: one cell per column.",
      ),
  })
  .refine(
    ({ kind, headers, rows }) => {
      // Headers on a flow are harmless, so they are ignored and never shown.
      if (kind === "steps") return rows.length >= 2 && rows.length <= 5 && rows.every((row) => row.length <= 2);
      if (kind === "compare") return headers.length === 2 && rows.length <= 4 && rows.every((row) => row.length === 2);
      return headers.length >= 2 && rows.every((row) => row.length === headers.length);
    },
    { error: "The diagram's headers and rows don't fit its kind." },
  );

export type FigureContent = z.infer<typeof figureSchema>;

const sectionSchema = z.object({
  heading: z.string().trim().min(2).max(80),
  paragraphs: z.array(z.string().trim().min(1).max(800)).min(1).max(4),
  blocks: z.array(codeBlockSchema).max(3).describe("Code examples for this section, in order; empty if none"),
  figure: figureSchema.nullable().describe("One diagram for this section, only when it makes the idea clearer; otherwise null"),
});

/** Code a question asks about. No output here: that would give the answer away. */
const questionCodeSchema = codeBlockSchema
  .pick({ language: true, filename: true, code: true })
  .nullable()
  .describe("Code the question refers to, or null. Never put the code inside the question text.");

const multipleChoiceSchema = z.object({
  type: z.literal("multiple_choice"),
  question: z.string().trim().min(5).max(300),
  code: questionCodeSchema,
  choices: z.array(z.string().trim().min(1).max(160)).min(3).max(4),
  answerIndex: z.int().min(0).max(3).describe("0-based index of the one correct choice"),
  explanation: z.string().trim().min(10).max(400).describe("Why the correct choice is right"),
});

const openSchema = z.object({
  type: z.literal("open"),
  question: z.string().trim().min(5).max(500),
  code: questionCodeSchema,
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
 * What a newly generated lesson must pass: the lesson schema plus rules that
 * keep exercises answerable. A failure makes the AI try again. Saved lessons
 * are read with lessonSchema alone, so older lessons that break these rules
 * still open (grading handles look-alike choices; see isCorrectChoice).
 */
export function generatedLessonSchema(trackType: Exclude<TrackType, "reading">) {
  return lessonSchema(trackType)
    .refine(
      (lesson) => lesson.exercises.every((e) => e.type !== "multiple_choice" || !hasLookalikeChoices(e.choices)),
      { error: "Two choices look the same once shown. Every choice must read differently; if spaces matter, say so in words." },
    )
    .refine((lesson) => lesson.exercises.every((e) => e.type !== "open" || isAnswerableSample(e.sampleAnswer)), {
      error: "A sampleAnswer holds at most one fenced code block: the learner answers in a single code box.",
    });
}

/**
 * Lessons saved before code blocks had a language and output kept one plain
 * `code` string per section, and their exercises had no code of their own.
 * Lessons saved before diagrams have no `figure` on their sections. This
 * rewrites the old shape into `blocks` and adds the missing `code: null` and
 * `figure: null`, so old lessons still open (without output, which was never
 * written for them). Anything else is returned as it is, for the schema to judge.
 */
export function upgradeLesson(content: unknown): unknown {
  if (typeof content !== "object" || content === null) return content;
  const lesson = content as { sections?: unknown; exercises?: unknown };
  if (!Array.isArray(lesson.sections)) return content;
  return {
    ...lesson,
    ...(Array.isArray(lesson.exercises) && {
      exercises: lesson.exercises.map((exercise: unknown) =>
        typeof exercise === "object" && exercise !== null && !("code" in exercise)
          ? { ...exercise, code: null }
          : exercise,
      ),
    }),
    sections: lesson.sections.map((section: unknown) => {
      if (typeof section !== "object" || section === null) return section;
      // Lessons saved before diagrams existed have no figure.
      const withFigure = "figure" in section ? section : { ...section, figure: null };
      if ("blocks" in withFigure) return withFigure;
      const { code, ...rest } = withFigure as { code?: unknown };
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
        ? { type: e.type, question: e.question, code: e.code, choices: e.choices }
        : { type: e.type, question: e.question, code: e.code, hint: e.hint },
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
