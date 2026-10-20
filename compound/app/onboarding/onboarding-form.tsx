"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import type { Goal, Weekday } from "@/lib/db/types";
import { HABIT_SUGGESTIONS } from "@/lib/onboarding/goals";
import { MAX_HABITS, type OnboardingInput } from "@/lib/validation/onboarding";
import { completeOnboarding } from "./actions";
import { GoalPicker } from "./goal-picker";
import { HabitList, type HabitDraft } from "./habit-list";
import { TimezoneSelect, useBrowserTimezone } from "./timezone-select";

const EVERY_DAY: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

export function OnboardingForm() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [customLabel, setCustomLabel] = useState("");
  const [habits, setHabits] = useState<HabitDraft[]>([{ key: 0, name: "", schedule: EVERY_DAY }]);
  const nextKey = useRef(1); // gives each new habit row a unique React key

  // The detected timezone is used until the user picks a different one.
  const browserTimezone = useBrowserTimezone();
  const [chosenTimezone, setChosenTimezone] = useState<string | null>(null);
  const timezone = chosenTimezone ?? browserTimezone;

  const [state, submit, pending] = useActionState(completeOnboarding, { errors: [] });

  function toggleGoal(goal: Goal) {
    setGoals((current) =>
      current.includes(goal) ? current.filter((g) => g !== goal) : [...current, goal],
    );
  }

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

  // Suggestions for the chosen goals, minus habits already added.
  const takenNames = new Set(habits.map((h) => h.name.trim().toLowerCase()));
  const suggestions = goals
    .flatMap((goal) => HABIT_SUGGESTIONS[goal])
    .filter((name) => !takenNames.has(name.toLowerCase()));

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const input: OnboardingInput = {
      goals: goals.map((goal) =>
        goal === "custom" ? { goal, customLabel } : { goal },
      ),
      habits: habits.map(({ name, schedule }) => ({ name, schedule })),
      timezone: timezone ?? "UTC",
    };
    startTransition(() => submit(input));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-10">
      <Section title="1. What are you working towards?" hint="Choose one or more.">
        <GoalPicker
          selected={goals}
          onToggle={toggleGoal}
          customLabel={customLabel}
          onCustomLabelChange={setCustomLabel}
        />
      </Section>

      <Section
        title="2. Your first habits"
        hint={`Start small: 1 to ${MAX_HABITS} habits. Tap a day to turn it off.`}
      >
        <HabitList habits={habits} onUpdate={updateHabit} onRemove={removeHabit} />

        {suggestions.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {suggestions.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => addHabit(name)}
                className="rounded-full border border-dashed border-foreground/30 px-3 py-1 text-sm hover:border-foreground"
              >
                + {name}
              </button>
            ))}
          </div>
        )}

        {habits.length < MAX_HABITS && (
          <button
            type="button"
            onClick={() => addHabit()}
            className="mt-4 text-sm underline underline-offset-4"
          >
            Add another habit
          </button>
        )}
      </Section>

      <Section title="3. Your timezone" hint="Used to decide when your day starts and ends.">
        <TimezoneSelect value={timezone} onChange={setChosenTimezone} />
      </Section>

      {state.errors.length > 0 && (
        <ul role="alert" className="rounded-lg border border-red-500/40 p-3 text-sm text-red-600">
          {state.errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}

      <button
        type="submit"
        disabled={pending || !timezone}
        className="rounded-lg bg-foreground px-4 py-3 font-medium text-background hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Start"}
      </button>
    </form>
  );
}

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mb-4 text-sm opacity-70">{hint}</p>
      {children}
    </section>
  );
}
