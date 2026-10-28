"use client";

import { startTransition, useOptimistic, useState, useTransition } from "react";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GoalStep } from "@/lib/goals/queries";
import { cn } from "@/lib/utils";
import { addStep, deleteStep, renameStep, toggleStep, type GoalActionResult } from "../actions";

/**
 * A milestone's steps: tick them off (instantly, saved in the background),
 * rename, delete, or add new ones.
 */
export function StepList({ milestoneId, steps, editable }: { milestoneId: string; steps: GoalStep[]; editable: boolean }) {
  const [shown, applyToggle] = useOptimistic(steps, (state, { id, done }: { id: string; done: boolean }) =>
    state.map((s) => (s.id === id ? { ...s, doneOn: done ? "today" : null } : s)),
  );
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startAction] = useTransition();

  function run(action: () => Promise<GoalActionResult>, after?: () => void) {
    setError(null);
    startAction(async () => {
      const result = await action();
      if (result.errors.length > 0) setError(result.errors[0]);
      else after?.();
    });
  }

  function toggle(step: GoalStep) {
    const done = step.doneOn === null;
    setError(null);
    startTransition(async () => {
      applyToggle({ id: step.id, done });
      const result = await toggleStep({ stepId: step.id, done });
      if (result.errors.length > 0) setError(result.errors[0]);
    });
  }

  return (
    <div>
      <ul className="flex flex-col">
        {shown.map((step) =>
          editing === step.id ? (
            <li key={step.id}>
              <StepEditor
                initial={step.title}
                pending={pending}
                onCancel={() => setEditing(null)}
                onSave={(title) => run(() => renameStep({ stepId: step.id, title }), () => setEditing(null))}
              />
            </li>
          ) : (
            <li key={step.id} className="group flex items-center gap-1">
              <button
                type="button"
                role="checkbox"
                aria-checked={step.doneOn !== null}
                onClick={() => toggle(step)}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-2 text-left text-sm outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-md border-2 transition-colors",
                    step.doneOn !== null ? "border-success bg-success text-white" : "border-border",
                  )}
                >
                  {step.doneOn !== null && <Check className="size-3.5" strokeWidth={3} />}
                </span>
                <span className={cn("break-words", step.doneOn !== null && "text-muted-foreground line-through")}>
                  {step.title}
                </span>
              </button>
              {editable && (
                <span className="flex shrink-0 opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                  <Button variant="ghost" size="icon-sm" aria-label={`Rename ${step.title}`} onClick={() => setEditing(step.id)}>
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${step.title}`}
                    disabled={pending}
                    onClick={() => run(() => deleteStep({ stepId: step.id }))}
                  >
                    <Trash2 />
                  </Button>
                </span>
              )}
            </li>
          ),
        )}
      </ul>

      {editable &&
        (editing === "new" ? (
          <StepEditor
            initial=""
            pending={pending}
            onCancel={() => setEditing(null)}
            onSave={(title) => run(() => addStep({ milestoneId, title }), () => setEditing(null))}
          />
        ) : (
          <Button variant="ghost" size="sm" className="mt-1 text-muted-foreground" onClick={() => setEditing("new")}>
            <Plus />
            Add a step
          </Button>
        ))}

      {error && (
        <p role="alert" className="mt-1 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function StepEditor({
  initial,
  pending,
  onSave,
  onCancel,
}: {
  initial: string;
  pending: boolean;
  onSave: (title: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(title);
      }}
      className="flex gap-2 p-1"
    >
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="A small step, e.g. Draft the about page"
        aria-label="Step"
        maxLength={120}
        autoFocus
        onKeyDown={(e) => e.key === "Escape" && onCancel()}
      />
      <Button type="submit" size="sm" className="h-8" disabled={pending || title.trim().length === 0}>
        Save
      </Button>
      <Button type="button" size="sm" variant="ghost" className="h-8" onClick={onCancel}>
        Cancel
      </Button>
    </form>
  );
}
