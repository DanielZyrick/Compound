"use client";

import { startTransition, useActionState, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addDays, daysBetween, formatShortDate } from "@/lib/dates/calendar";
import type { CalendarDate } from "@/lib/db/types";
import { bufferDaysFor, DEFAULT_BUFFER_PERCENT, workEndFor } from "@/lib/goals/schedule";
import {
  BUFFER_PERCENT_OPTIONS,
  deadlineError,
  MAX_GOAL_DAYS,
  MIN_GOAL_DAYS,
  newGoalSchema,
} from "@/lib/validation/goals";
import { createGoal } from "./actions";

export function NewGoalForm({ today, demoMode }: { today: CalendarDate; demoMode: boolean }) {
  const [title, setTitle] = useState("");
  const [why, setWhy] = useState("");
  const [deadline, setDeadline] = useState("");
  const [bufferPercent, setBufferPercent] = useState<number>(DEFAULT_BUFFER_PERCENT);
  // Errors stay hidden until the first submit, then update as the user types.
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [state, submit, pending] = useActionState(createGoal, { errors: [] });

  const input = { title, why, deadline, bufferPercent };
  const parsed = newGoalSchema.safeParse(input);
  const dateProblem = parsed.success ? deadlineError(today, deadline) : null;
  const clientErrors = parsed.success
    ? dateProblem
      ? [dateProblem]
      : []
    : [...new Set(parsed.error.issues.map((i) => i.message))];

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setTriedSubmit(true);
    if (clientErrors.length > 0) return;
    startTransition(() => submit(input));
  }

  const errors = triedSubmit && clientErrors.length > 0 ? clientErrors : state.errors;
  const validDeadline = parsed.success && !dateProblem;
  const year = today.slice(0, 4);

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="goal-title">Your goal</Label>
        <Input
          id="goal-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Launch my portfolio website"
          maxLength={100}
          className="h-10"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="goal-why">Why it matters to you</Label>
        <Textarea
          id="goal-why"
          value={why}
          onChange={(e) => setWhy(e.target.value)}
          placeholder="e.g. So I can apply for developer jobs with real projects to show."
          maxLength={500}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="goal-deadline">Deadline</Label>
        <Input
          id="goal-deadline"
          type="date"
          value={deadline}
          min={addDays(today, MIN_GOAL_DAYS)}
          max={addDays(today, MAX_GOAL_DAYS)}
          onChange={(e) => setDeadline(e.target.value)}
          className="h-10 sm:max-w-56"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor="goal-buffer">Buffer time</Label>
          <span className="text-sm tabular-nums">{bufferPercent}%</span>
        </div>
        <input
          id="goal-buffer"
          type="range"
          min={BUFFER_PERCENT_OPTIONS[0]}
          max={BUFFER_PERCENT_OPTIONS.at(-1)}
          step={5}
          value={bufferPercent}
          onChange={(e) => setBufferPercent(Number(e.target.value))}
          className="accent-primary"
          aria-describedby="buffer-help"
        />
        <p id="buffer-help" className="text-sm text-muted-foreground" aria-live="polite">
          {validDeadline ? <BufferPreview today={today} deadline={deadline} percent={bufferPercent} year={year} /> : (
            "Time kept free before the deadline for things that go wrong. 15% is a good default."
          )}
        </p>
      </div>

      {errors.length > 0 && (
        <ul
          role="alert"
          className="flex flex-col gap-1 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}

      <div className="flex flex-col items-end gap-2">
        <Button type="submit" disabled={pending} className="h-10 px-5">
          <Sparkles />
          {pending ? "Planning your goal…" : "Create goal"}
        </Button>
        <p className="text-right text-xs text-muted-foreground" aria-live="polite">
          {pending
            ? demoMode
              ? "Creating your example plan…"
              : "The AI is writing your plan and guide. This can take up to 30 seconds."
            : demoMode
              ? "Demo mode: you'll get an example plan, not an AI-written one."
              : "The AI breaks your goal into milestones and steps, and writes a short guide."}
        </p>
      </div>
    </form>
  );
}

/** "Plan to finish by Dec 8, with Dec 9–15 (7 days) kept free." */
function BufferPreview({ today, deadline, percent, year }: { today: CalendarDate; deadline: CalendarDate; percent: number; year: string }) {
  const bufferDays = bufferDaysFor(today, deadline, percent);
  const workEnd = workEndFor(deadline, bufferDays);
  const workDays = daysBetween(today, workEnd) + 1;
  if (bufferDays === 0) {
    return <>No buffer: the plan uses all {workDays} days until {formatShortDate(deadline, year)}.</>;
  }
  const bufferStart = addDays(workEnd, 1);
  // "Nov 23–27" within one month, "Nov 28–Dec 2" across two.
  const range =
    bufferStart.slice(0, 7) === deadline.slice(0, 7)
      ? `${formatShortDate(bufferStart, year)}–${Number(deadline.slice(8))}`
      : `${formatShortDate(bufferStart, year)}–${formatShortDate(deadline, year)}`;
  return (
    <>
      Plan to finish by <strong className="font-medium text-foreground">{formatShortDate(workEnd, year)}</strong>{" "}
      ({workDays} days of work), keeping {range} ({bufferDays} {bufferDays === 1 ? "day" : "days"}) free for
      setbacks.
    </>
  );
}
