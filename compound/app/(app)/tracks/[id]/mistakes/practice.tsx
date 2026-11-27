import { CodeBlock } from "@/components/code-block";
import { RichText } from "@/components/rich-text";
import { isCorrectChoice } from "@/lib/lessons/choices";
import { answerLanguage } from "@/lib/lessons/code-editing";
import type { Mistake } from "@/lib/mistakes/collect";
import { MAX_PRACTICE_PER_MISTAKE, practiceState } from "@/lib/mistakes/practice";
import type { PracticeRow } from "@/lib/mistakes/queries";
import { MultipleChoiceExercise, OpenExercise } from "../../exercises";
import { PracticeButton } from "./practice-button";

/**
 * A mistake's practice exercises (oldest first), then a button for another
 * while it isn't fixed. Uses the lesson's exercise components; anything
 * that could give the answer away is only sent once it's answered.
 */
export function Practice({ mistake, practice }: { mistake: Mistake; practice: PracticeRow[] }) {
  const state = practiceState(practice);
  const fixed = mistake.fixedLater || state === "fixed";
  if (practice.length === 0 && fixed) return null;

  return (
    <div className="flex flex-col gap-3">
      {practice.map((row, i) => (
        <PracticeExercise key={row.id} row={row} label={`Practice ${i + 1}${row.source === "demo" ? " · example" : ""}`} />
      ))}
      {!fixed && state === "ready" && (
        <PracticeButton lessonId={mistake.lessonId} exerciseIndex={mistake.exerciseIndex} again={practice.length > 0} />
      )}
      {!fixed && state === "used_up" && (
        <p className="text-sm text-muted-foreground">
          You&apos;ve had {MAX_PRACTICE_PER_MISTAKE} practice exercises for this one. Going over the lesson again may
          help more now.
        </p>
      )}
    </div>
  );
}

function PracticeExercise({ row, label }: { row: PracticeRow; label: string }) {
  const { exercise } = row;
  const target = { practiceId: row.id };
  const code = exercise.code && <CodeBlock block={{ ...exercise.code, output: null, result: null }} />;

  if (exercise.type === "multiple_choice") {
    const chosen = Number(row.answer);
    const isCorrect = row.answered && isCorrectChoice(exercise.choices, chosen, exercise.answerIndex);
    return (
      <MultipleChoiceExercise
        target={target}
        label={label}
        question={exercise.question}
        code={code}
        choices={exercise.choices}
        result={
          row.answered
            ? { chosen, correctIndex: isCorrect ? chosen : exercise.answerIndex, isCorrect, explanation: exercise.explanation }
            : null
        }
      />
    );
  }

  const language = answerLanguage(exercise.sampleAnswer);
  return (
    <OpenExercise
      target={target}
      label={label}
      question={exercise.question}
      code={code}
      hint={exercise.hint}
      answerLanguage={language}
      attempts={
        row.answered && row.answer !== null
          ? [
              {
                answer: row.answer,
                answerCode: language && (
                  <CodeBlock block={{ language, filename: null, code: row.answer, output: null, result: null }} />
                ),
                isCorrect: row.isCorrect,
                feedback: row.feedback && <RichText text={row.feedback} />,
                betterVersion: row.betterVersion && row.isCorrect !== null && <RichText text={row.betterVersion} />,
              },
            ]
          : []
      }
      remaining={row.answered ? 0 : 1}
      sampleAnswer={row.answered ? <RichText text={exercise.sampleAnswer} /> : null}
      usedUpText={null}
    />
  );
}
