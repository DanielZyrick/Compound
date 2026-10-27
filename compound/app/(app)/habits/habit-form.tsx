"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WeekdayPicker } from "@/components/weekday-picker";
import type { Weekday } from "@/lib/db/types";
import { habitSchema } from "@/lib/validation/habits";
import { saveHabit } from "./actions";

const EVERY_DAY: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

type Props = {
  /** The habit being edited; leave out to add a new one. */
  habit?: { id: string; name: string; schedule: Weekday[] };
  onDone: () => void;
};

export function HabitForm({ habit, onDone }: Props) {
  const [name, setName] = useState(habit?.name ?? "");
  const [schedule, setSchedule] = useState<Weekday[]>(habit?.schedule ?? EVERY_DAY);
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const idPrefix = habit ? `habit-${habit.id}` : "new-habit";

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    // Check here first for instant feedback; the server checks again.
    const parsed = habitSchema.safeParse({ name, schedule });
    if (!parsed.success) {
      return setErrors([...new Set(parsed.error.issues.map((issue) => issue.message))]);
    }
    startTransition(async () => {
      const result = await saveHabit({ id: habit?.id, name, schedule });
      if (result.errors.length > 0) setErrors(result.errors);
      else onDone();
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 rounded-xl border bg-muted/40 p-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-name`}>{habit ? "Habit name" : "New habit"}</Label>
        <Input
          id={`${idPrefix}-name`}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setErrors([]); // the old message no longer applies
          }}
          placeholder="e.g. Read 10 pages"
          maxLength={60}
          autoFocus
          className="h-10 bg-background"
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Days</span>
        <WeekdayPicker
          value={schedule}
          onChange={(days) => {
            setSchedule(days);
            setErrors([]);
          }}
        />
      </div>

      {errors.length > 0 && (
        <ul role="alert" className="text-sm text-destructive">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : habit ? "Save" : "Add habit"}
        </Button>
      </div>
    </form>
  );
}
