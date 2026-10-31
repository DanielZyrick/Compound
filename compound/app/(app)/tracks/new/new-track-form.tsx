"use client";

import { startTransition, useActionState, useState } from "react";
import { BookOpen, Sparkles } from "lucide-react";
import { OptionGroup } from "@/components/option-group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TrackLevel, TrackType } from "@/lib/db/types";
import { READING_PLANS, type ReadingPlanId } from "@/lib/reading/plans";
import { newTrackSchema } from "@/lib/validation/tracks";
import { createTrack } from "./actions";

/** A suggestion from "Recommended for you", passed in the link. */
export type TrackPrefill = { topic: string; type: "skill" | "thinking"; level: TrackLevel; totalDays: number };

export function NewTrackForm({ demoMode, prefill }: { demoMode: boolean; prefill: TrackPrefill | null }) {
  const [type, setType] = useState<TrackType | null>(prefill?.type ?? null);
  const [topic, setTopic] = useState(prefill?.topic ?? "");
  const [level, setLevel] = useState<TrackLevel | null>(prefill?.level ?? null);
  const [totalDays, setTotalDays] = useState<number | null>(prefill?.totalDays ?? 14);
  const [readingPlan, setReadingPlan] = useState<ReadingPlanId | null>(null);
  const [addHabit, setAddHabit] = useState(true);
  // Errors stay hidden until the first submit, then update as the user types.
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [state, submit, pending] = useActionState(createTrack, { errors: [] });

  const reading = type === "reading";
  const input = reading
    ? { type, readingPlan, addHabit }
    : { type, topic, level, totalDays, addHabit };
  const parsed = newTrackSchema.safeParse(input);
  const clientErrors = parsed.success ? [] : [...new Set(parsed.error.issues.map((i) => i.message))];

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setTriedSubmit(true);
    // Instant feedback here; the server validates again.
    if (!parsed.success) return;
    startTransition(() => submit(input));
  }

  const errors = triedSubmit && clientErrors.length > 0 ? clientErrors : state.errors;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <OptionGroup
        name="type"
        legend="Type"
        stackOnMobile
        value={type}
        onChange={setType}
        options={[
          { value: "skill", label: "Skill", hint: "Exercises with right answers: languages, coding, tools" },
          { value: "thinking", label: "Thinking", hint: "Real-life scenarios to reason through" },
          { value: "reading", label: "Reading", hint: "A Bible reading plan with a daily reflection" },
        ]}
      />

      {reading ? (
        <OptionGroup
          name="reading-plan"
          legend="Reading plan"
          stackOnMobile
          value={readingPlan}
          onChange={setReadingPlan}
          options={READING_PLANS.map((plan) => ({ value: plan.id, label: plan.title, hint: plan.description }))}
        />
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="topic">What do you want to learn?</Label>
            <Input
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. SQL for data analysis, or negotiating a salary"
              maxLength={120}
              className="h-10"
            />
          </div>

          <OptionGroup
            name="level"
            legend="Your level"
            value={level}
            onChange={setLevel}
            options={[
              { value: "beginner", label: "Beginner" },
              { value: "intermediate", label: "Intermediate" },
              { value: "advanced", label: "Advanced" },
            ]}
          />

          <OptionGroup
            name="length"
            legend="Length"
            value={totalDays}
            onChange={setTotalDays}
            options={[
              { value: 7, label: "7 days", hint: "A quick start" },
              { value: 14, label: "14 days", hint: "Recommended" },
              { value: 30, label: "30 days", hint: "Go deep" },
            ]}
          />
        </>
      )}

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-3">
        <input
          type="checkbox"
          checked={addHabit}
          onChange={(e) => setAddHabit(e.target.checked)}
          className="mt-0.5 size-4 accent-primary"
        />
        <span>
          <span className="block text-sm font-medium">Add a daily habit for this track</span>
          <span className="block text-xs text-muted-foreground">
            It shows on Today, so you build a streak while you {reading ? "read" : "learn"}.
          </span>
        </span>
      </label>

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
          {reading ? <BookOpen /> : <Sparkles />}
          {pending ? (reading ? "Creating…" : "Building your plan…") : "Create track"}
        </Button>
        <p className="text-right text-xs text-muted-foreground" aria-live="polite">
          {reading
            ? "A fixed plan: you read each passage in a real translation and write your own reflection. No AI."
            : pending
              ? demoMode
                ? "Creating your example plan…"
                : "The AI is writing your plan. This can take up to 30 seconds."
              : demoMode
                ? "Demo mode: you'll get an example plan, not an AI-written one."
                : "The AI writes a day-by-day plan based on your answers and your focus."}
        </p>
      </div>
    </form>
  );
}
