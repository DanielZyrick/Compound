import { isCorrectChoice } from "@/lib/lessons/choices";
import type { Exercise, LessonContent } from "@/lib/lessons/schema";

// Mistakes are worked out from saved answers (attempts), never stored, like
// streaks. A mistake is an exercise whose FIRST answer was wrong. A later try
// that got it right (open answers allow up to 3) marks it "fixed later".
// Ungraded answers (demo mode, is_correct null) never count.

export type MistakeDay = { dayNumber: number; dayTitle: string; lesson: LessonContent };

export type MistakeAttempt = {
  dayNumber: number;
  exerciseIndex: number;
  answer: string;
  isCorrect: boolean | null;
  feedback: string | null;
  betterVersion: string | null;
};

export type Mistake = {
  dayNumber: number;
  dayTitle: string;
  exerciseIndex: number;
  type: Exercise["type"];
  question: string;
  code: Exercise["code"];
  yourAnswer: string;
  /** The correct choice, or the example answer for open questions. */
  rightAnswer: string;
  /** Why: the choice's explanation, or the AI's feedback on the first answer. */
  why: string | null;
  betterVersion: string | null;
  fixedLater: boolean;
};

/**
 * Every mistake in a track, newest day first, then in exercise order.
 * Attempts must be in the order they were made.
 */
export function collectMistakes(days: MistakeDay[], attempts: MistakeAttempt[]): Mistake[] {
  const mistakes: Mistake[] = [];
  const newestFirst = [...days].sort((a, b) => b.dayNumber - a.dayNumber);

  for (const day of newestFirst) {
    day.lesson.exercises.forEach((exercise, exerciseIndex) => {
      const mine = attempts.filter((a) => a.dayNumber === day.dayNumber && a.exerciseIndex === exerciseIndex);
      const first = mine[0];
      if (!first) return;
      const base = {
        dayNumber: day.dayNumber,
        dayTitle: day.dayTitle,
        exerciseIndex,
        type: exercise.type,
        question: exercise.question,
        code: exercise.code,
      };

      if (exercise.type === "multiple_choice") {
        const chosen = Number(first.answer);
        const picked = exercise.choices[chosen];
        // Graded again, as on the lesson page: a look-alike of the right answer counts as right.
        if (picked === undefined || isCorrectChoice(exercise.choices, chosen, exercise.answerIndex)) return;
        mistakes.push({
          ...base,
          yourAnswer: picked,
          rightAnswer: exercise.choices[exercise.answerIndex],
          why: exercise.explanation,
          betterVersion: null,
          fixedLater: false, // one answer per multiple-choice exercise
        });
        return;
      }

      if (first.isCorrect !== false) return;
      mistakes.push({
        ...base,
        yourAnswer: first.answer,
        rightAnswer: exercise.sampleAnswer,
        why: first.feedback,
        betterVersion: first.betterVersion,
        fixedLater: mine.slice(1).some((a) => a.isCorrect === true),
      });
    });
  }
  return mistakes;
}

/** The mistakes still worth reviewing: not fixed by a later try. */
export function mistakesToReview(mistakes: Mistake[]): Mistake[] {
  return mistakes.filter((m) => !m.fixedLater);
}
