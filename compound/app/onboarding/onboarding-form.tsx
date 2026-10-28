"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Weekday } from "@/lib/db/types";
import { cn } from "@/lib/utils";
import {
  focusSchema,
  habitsSchema,
  MAX_HABITS,
  timezoneSchema,
  type OnboardingInput,
} from "@/lib/validation/onboarding";
import { completeOnboarding } from "./actions";
import { FocusStep, type FocusDraft } from "./focus-step";
import type { HabitDraft } from "./habit-list";
import { HabitsStep } from "./habits-step";
import { ReviewStep } from "./review-step";
import { useBrowserTimezone } from "@/components/timezone-select";

const EVERY_DAY: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

const STEPS = [
  {
    name: "Focus",
    title: "What do you want to work on?",
    hint: "Pick one focus and tell us what you want to achieve. You can add more later.",
  },
  {
    name: "Habits",
    title: "Your first habits",
    hint: `Small daily steps toward your focus: 1 to ${MAX_HABITS} habits. Tap a day to turn it off.`,
  },
  {
    name: "Review",
    title: "Almost done",
    hint: "Check your timezone and make sure everything looks right.",
  },
];
const LAST_STEP = STEPS.length - 1;

// One form split into steps. Nothing is saved until the last step: each Next
// validates only the current step, and Start sends everything to the server
// action, which validates it all again and saves it in one transaction.
export function OnboardingForm() {
  const [step, setStep] = useState(0);
  // Errors stay hidden until the user tries to continue, then update live.
  const [triedNext, setTriedNext] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const [focus, setFocus] = useState<FocusDraft>({ goal: null, customLabel: "", description: "" });
  const [habits, setHabits] = useState<HabitDraft[]>([{ key: 0, name: "", schedule: EVERY_DAY }]);
  const nextKey = useRef(1); // gives each new habit row a unique React key

  // The detected timezone is used until the user picks a different one.
  const browserTimezone = useBrowserTimezone();
  const [chosenTimezone, setChosenTimezone] = useState<string | null>(null);
  const timezone = chosenTimezone ?? browserTimezone;

  const [state, submit, pending] = useActionState(completeOnboarding, { errors: [] });

  function updateHabit(key: number, changes: Partial<HabitDraft>) {
    setHabits((current) => current.map((h) => (h.key === key ? { ...h, ...changes } : h)));
  }

  function removeHabit(key: number) {
    setHabits((current) => current.filter((h) => h.key !== key));
  }

  function addHabit(name = "") {
    // Fill an empty row first; only add a new row if there isn't one.
    const empty = habits.find((h) => h.name.trim() === "");
    if (empty) return updateHabit(empty.key, { name });
    if (habits.length >= MAX_HABITS) return;
    setHabits([...habits, { key: nextKey.current++, name, schedule: EVERY_DAY }]);
  }

  const input = {
    focus: focus.goal === "custom" ? focus : { goal: focus.goal, description: focus.description },
    habits: habits.map(({ name, schedule }) => ({ name, schedule })),
    timezone: timezone ?? "",
  };

  function stepErrors(): string[] {
    const result = [
      () => focusSchema.safeParse(input.focus),
      () => habitsSchema.safeParse(input.habits),
      () => timezoneSchema.safeParse(input.timezone),
    ][step]();
    return result.success ? [] : [...new Set(result.error.issues.map((issue) => issue.message))];
  }
  const errors = triedNext ? stepErrors() : [];

  function goTo(next: number) {
    setStep(next);
    setTriedNext(false);
    // Move keyboard and screen reader focus to the new step's heading.
    requestAnimationFrame(() => headingRef.current?.focus());
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (stepErrors().length > 0) return setTriedNext(true);
    if (step < LAST_STEP) return goTo(step + 1);
    // The step checks above make this input valid; the server checks again.
    startTransition(() => submit(input as OnboardingInput));
  }

  const { title, hint } = STEPS[step];
  const serverErrors = step === LAST_STEP ? state.errors : [];

  return (
    <form onSubmit={handleSubmit} noValidate>
      <StepProgress current={step} />

      <h1
        ref={headingRef}
        tabIndex={-1}
        className="mt-6 text-2xl font-semibold tracking-tight outline-none"
      >
        {title}
      </h1>
      <p className="mt-1 mb-8 text-muted-foreground">{hint}</p>

      {step === 0 && (
        <FocusStep focus={focus} onChange={(changes) => setFocus({ ...focus, ...changes })} />
      )}
      {step === 1 && (
        <HabitsStep
          goal={focus.goal}
          habits={habits}
          onUpdate={updateHabit}
          onRemove={removeHabit}
          onAdd={addHabit}
        />
      )}
      {step === 2 && (
        <ReviewStep
          focus={focus}
          habits={habits}
          timezone={timezone}
          onTimezoneChange={setChosenTimezone}
          onEdit={goTo}
        />
      )}

      {[...errors, ...serverErrors].length > 0 && (
        <ul
          role="alert"
          className="mt-6 flex flex-col gap-1 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {[...new Set([...errors, ...serverErrors])].map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}

      <div className="mt-8 flex items-center justify-between gap-3">
        {step > 0 ? (
          <Button type="button" variant="ghost" size="lg" onClick={() => goTo(step - 1)}>
            <ArrowLeft />
            Back
          </Button>
        ) : (
          <span />
        )}
        <Button
          type="submit"
          size="lg"
          disabled={pending || (step === LAST_STEP && !timezone)}
          className="h-10 px-5"
        >
          {step < LAST_STEP ? (
            <>
              Next
              <ArrowRight />
            </>
          ) : pending ? (
            "Saving…"
          ) : (
            "Start"
          )}
        </Button>
      </div>
    </form>
  );
}

function StepProgress({ current }: { current: number }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">
        Step {current + 1} of {STEPS.length}
      </p>
      <ol className="mt-2 flex gap-2">
        {STEPS.map((s, i) => (
          <li
            key={s.name}
            aria-current={i === current ? "step" : undefined}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i <= current ? "bg-primary" : "bg-border",
            )}
          >
            <span className="sr-only">
              {s.name}
              {i < current ? " (done)" : ""}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
