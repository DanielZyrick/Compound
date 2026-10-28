"use client";

import { startTransition, useOptimistic, useState } from "react";
import { Check, Flame } from "lucide-react";
import { describeSchedule } from "@/lib/dates/schedule";
import type { HabitSummary } from "@/lib/habits/queries";
import { cn } from "@/lib/utils";
import { setCheckin } from "./actions";

type Toggle = { id: string; done: boolean };

// Checking a habit updates the screen immediately (optimistic), then the
// server saves it and re-renders the page. If saving fails, React drops the
// optimistic change and the row goes back to how it was.
export function HabitChecklist({ habits }: { habits: HabitSummary[] }) {
  const [shown, applyToggle] = useOptimistic(habits, (state, { id, done }: Toggle) =>
    state.map((h) =>
      h.id === id && h.doneToday !== done
        ? { ...h, doneToday: done, streak: h.streak + (done ? 1 : -1) }
        : h,
    ),
  );
  const [failed, setFailed] = useState(false);

  function toggle(habit: HabitSummary) {
    const done = !habit.doneToday;
    setFailed(false);
    startTransition(async () => {
      applyToggle({ id: habit.id, done });
      const { ok } = await setCheckin({ habitId: habit.id, done });
      if (!ok) setFailed(true);
    });
  }

  const doneCount = shown.filter((h) => h.doneToday).length;

  return (
    <section className="rounded-2xl border p-5 shadow-card">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">Habits</h2>
        <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
          {doneCount} of {shown.length} done
        </p>
      </div>
      <div
        role="progressbar"
        aria-label="Habits done today"
        aria-valuemin={0}
        aria-valuemax={shown.length}
        aria-valuenow={doneCount}
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${(doneCount / shown.length) * 100}%` }}
        />
      </div>

      <ul className="mt-4 flex flex-col gap-1">
        {shown.map((habit) => (
          <li key={habit.id}>
            <HabitRow habit={habit} onToggle={() => toggle(habit)} />
          </li>
        ))}
      </ul>

      {failed && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          Couldn&apos;t save that. Please try again.
        </p>
      )}
    </section>
  );
}

function HabitRow({ habit, onToggle }: { habit: HabitSummary; onToggle: () => void }) {
  const { name, schedule, doneToday, streak } = habit;

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={doneToday}
      onClick={onToggle}
      className="flex w-full items-center gap-3 rounded-xl p-2 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span
        className={cn(
          "grid size-7 shrink-0 place-items-center rounded-full border-2 transition-colors",
          doneToday ? "border-success bg-success text-white" : "border-border",
        )}
      >
        {doneToday && <Check className="size-4" strokeWidth={3} />}
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "line-clamp-2 block font-medium break-words transition-colors",
            doneToday && "text-muted-foreground line-through",
          )}
        >
          {name}
        </span>
        <span className="block text-xs text-muted-foreground">{describeSchedule(schedule)}</span>
      </span>

      {streak > 0 && (
        <span
          className="flex shrink-0 items-center gap-1 text-sm font-medium tabular-nums"
          aria-label={`${streak}-day streak`}
        >
          <Flame className="size-4 fill-orange-400 text-orange-500" />
          {streak}
        </span>
      )}
    </button>
  );
}
