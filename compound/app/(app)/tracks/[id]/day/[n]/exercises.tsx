"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { answerMultipleChoice, submitOpenAnswer } from "./actions";

// The exercise props only ever contain what the learner may see: answers,
// explanations and sample answers arrive from the server after an attempt.

export type MultipleChoiceProps = {
  lessonId: string;
  index: number;
  question: string;
  choices: string[];
  result: { chosen: number; correctIndex: number; isCorrect: boolean; explanation: string } | null;
};

export function MultipleChoiceExercise({ lessonId, index, question, choices, result }: MultipleChoiceProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const name = `exercise-${index}`;

  function check() {
    if (selected === null) return setErrors(["Choose an answer first."]);
    setErrors([]);
    startTransition(async () => {
      const response = await answerMultipleChoice({ lessonId, exerciseIndex: index, choiceIndex: selected });
      setErrors(response.errors);
    });
  }

  return (
    <ExerciseCard index={index} question={question}>
      <fieldset disabled={result !== null || pending} className="flex flex-col gap-2">
        <legend className="sr-only">{question}</legend>
        {choices.map((choice, i) => {
          const isChosen = result ? result.chosen === i : selected === i;
          const isAnswer = result?.correctIndex === i;
          return (
            <label
              key={i}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                !result && "hover:bg-muted has-checked:border-primary has-checked:bg-primary/5",
                result && isAnswer && "border-success bg-success/10",
                result && isChosen && !isAnswer && "border-destructive bg-destructive/5",
                result && "cursor-default",
              )}
            >
              <input
                type="radio"
                name={name}
                checked={isChosen}
                onChange={() => setSelected(i)}
                className="size-4 accent-primary"
              />
              <span className="flex-1">{choice}</span>
              {result && isAnswer && <Check className="size-4 text-success" aria-label="Correct answer" />}
              {result && isChosen && !isAnswer && <X className="size-4 text-destructive" aria-label="Your answer" />}
            </label>
          );
        })}
      </fieldset>

      {result ? (
        <ResultNote correct={result.isCorrect}>{result.explanation}</ResultNote>
      ) : (
        <Button onClick={check} disabled={pending} variant="outline" className="mt-3 self-start">
          {pending ? "Checking…" : "Check answer"}
        </Button>
      )}
      <Errors errors={errors} />
    </ExerciseCard>
  );
}

export type OpenAttempt = {
  answer: string;
  isCorrect: boolean | null; // null: not graded (demo mode)
  feedback: string | null;
  betterVersion: string | null;
};

export type OpenProps = {
  lessonId: string;
  index: number;
  question: string;
  hint: string | null;
  attempts: OpenAttempt[];
  remaining: number;
  /** Revealed by the server after the first attempt. */
  sampleAnswer: string | null;
};

export function OpenExercise({ lessonId, index, question, hint, attempts, remaining, sampleAnswer }: OpenProps) {
  const [answer, setAnswer] = useState(attempts.at(-1)?.answer ?? "");
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const id = `answer-${index}`;

  function submit() {
    setErrors([]);
    startTransition(async () => {
      const response = await submitOpenAnswer({ lessonId, exerciseIndex: index, answer });
      setErrors(response.errors);
    });
  }

  return (
    <ExerciseCard index={index} question={question}>
      {hint && <p className="-mt-1 mb-3 text-sm text-muted-foreground">Hint: {hint}</p>}

      {attempts.map((attempt, i) => (
        <div key={i} className="mb-3 rounded-xl border bg-muted/40 p-3 text-sm">
          <p className="text-xs font-medium text-muted-foreground">Your answer {attempts.length > 1 ? i + 1 : ""}</p>
          <p className="mt-1 whitespace-pre-line">{attempt.answer}</p>
          {attempt.feedback && (
            <ResultNote correct={attempt.isCorrect}>
              {attempt.feedback}
              {attempt.betterVersion && attempt.isCorrect !== null && (
                <span className="mt-2 block">
                  <span className="font-medium">A stronger version: </span>
                  {attempt.betterVersion}
                </span>
              )}
            </ResultNote>
          )}
        </div>
      ))}

      {sampleAnswer && (
        <details className="mb-3 text-sm">
          <summary className="cursor-pointer font-medium">Show an example answer</summary>
          <p className="mt-2 whitespace-pre-line text-muted-foreground">{sampleAnswer}</p>
        </details>
      )}

      {remaining > 0 ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor={id} className="sr-only">
            Your answer
          </Label>
          <Textarea
            id={id}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Write your answer…"
            maxLength={2000}
            disabled={pending}
            className="min-h-24"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              {remaining} {remaining === 1 ? "review" : "reviews"} left
            </span>
            <Button onClick={submit} disabled={pending || answer.trim().length === 0} variant="outline">
              {pending ? "Reviewing…" : attempts.length > 0 ? "Try again" : "Get feedback"}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">You&apos;ve used all reviews for this exercise.</p>
      )}
      <Errors errors={errors} />
    </ExerciseCard>
  );
}

function ExerciseCard({ index, question, children }: { index: number; question: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col rounded-2xl border p-5">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Exercise {index + 1}</p>
      <h3 className="mt-1 mb-4 font-medium whitespace-pre-line">{question}</h3>
      {children}
    </section>
  );
}

function ResultNote({ correct, children }: { correct: boolean | null; children: React.ReactNode }) {
  const label = correct === null ? "Not graded" : correct ? "Correct" : "Not quite";
  return (
    <div
      className={cn(
        "mt-3 rounded-lg p-3 text-sm",
        correct === null && "bg-muted",
        correct === true && "bg-success/10",
        correct === false && "bg-destructive/5",
      )}
    >
      <p
        className={cn(
          "font-medium",
          correct === true && "text-success",
          correct === false && "text-destructive",
        )}
      >
        {label}
      </p>
      <p className="mt-1 whitespace-pre-line">{children}</p>
    </div>
  );
}

function Errors({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  return (
    <p role="alert" className="mt-2 text-sm text-destructive">
      {errors.join(" ")}
    </p>
  );
}
