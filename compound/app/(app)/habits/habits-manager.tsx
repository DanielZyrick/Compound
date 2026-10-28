"use client";

import { useState, useTransition } from "react";
import { Archive, ArchiveRestore, Flame, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { describeSchedule } from "@/lib/dates/schedule";
import type { ArchivedHabit, HabitSummary } from "@/lib/habits/queries";
import { MAX_ACTIVE_HABITS } from "@/lib/validation/habits";
import { setArchived } from "./actions";
import { HabitForm } from "./habit-form";

type Props = { active: HabitSummary[]; archived: ArchivedHabit[] };

// Which habit is open in the form: "new", a habit's id, or none.
type Editing = "new" | string | null;

export function HabitsManager({ active, archived }: Props) {
  const [editing, setEditing] = useState<Editing>(active.length === 0 ? "new" : null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const atLimit = active.length >= MAX_ACTIVE_HABITS;

  function archive(id: string, archived: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await setArchived({ id, archived });
      if (result.errors.length > 0) setError(result.errors[0]);
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">
            Active <span className="font-normal text-muted-foreground">({active.length})</span>
          </h2>
          {editing !== "new" && (
            <Button
              onClick={() => setEditing("new")}
              disabled={atLimit}
              title={atLimit ? `Up to ${MAX_ACTIVE_HABITS} active habits` : undefined}
            >
              <Plus />
              New habit
            </Button>
          )}
        </div>

        <ul className="mt-4 flex flex-col gap-3">
          {editing === "new" && (
            <li>
              <HabitForm onDone={() => setEditing(null)} />
            </li>
          )}
          {active.map((habit) => (
            <li key={habit.id}>
              {editing === habit.id ? (
                <HabitForm habit={habit} onDone={() => setEditing(null)} />
              ) : (
                <HabitCard
                  habit={habit}
                  disabled={pending}
                  onEdit={() => setEditing(habit.id)}
                  onArchive={() => archive(habit.id, true)}
                />
              )}
            </li>
          ))}
        </ul>

        {active.length === 0 && editing !== "new" && (
          <p className="mt-4 text-sm text-muted-foreground">No active habits. Add one to get started.</p>
        )}
      </section>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {archived.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer font-semibold">
            Archived <span className="font-normal text-muted-foreground">({archived.length})</span>
          </summary>
          <p className="mt-1 text-sm text-muted-foreground">
            Hidden from Today. Their history is kept, so restoring brings the streak back.
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {archived.map((habit) => (
              <li key={habit.id} className="flex items-center justify-between gap-3 rounded-xl border px-4 py-2">
                <span className="line-clamp-2 break-words text-muted-foreground">{habit.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => archive(habit.id, false)}
                >
                  <ArchiveRestore />
                  Restore
                </Button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function HabitCard({
  habit,
  disabled,
  onEdit,
  onArchive,
}: {
  habit: HabitSummary;
  disabled: boolean;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const { name, schedule, streak, totalCheckins } = habit;

  return (
    <div className="flex items-center gap-3 rounded-xl border p-4">
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 font-medium break-words">{name}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {describeSchedule(schedule)} · {totalCheckins} {totalCheckins === 1 ? "check-in" : "check-ins"}
        </p>
      </div>

      <span
        className="flex shrink-0 items-center gap-1 text-sm font-medium tabular-nums"
        aria-label={`${streak}-day streak`}
      >
        <Flame
          className={streak > 0 ? "size-4 fill-orange-400 text-orange-500" : "size-4 text-subtle"}
        />
        {streak}
      </span>

      <div className="flex shrink-0">
        <Button variant="ghost" size="icon" onClick={onEdit} disabled={disabled} aria-label={`Edit ${name}`}>
          <Pencil />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onArchive}
          disabled={disabled}
          aria-label={`Archive ${name}`}
        >
          <Archive />
        </Button>
      </div>
    </div>
  );
}
