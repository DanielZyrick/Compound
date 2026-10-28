"use client";

import Link from "next/link";
import { startTransition, useOptimistic, useState } from "react";
import { Check, Target } from "lucide-react";
import type { GoalStatusLevel } from "@/lib/goals/schedule";
import { cn } from "@/lib/utils";
import { toggleStep } from "../goals/actions";
import { GoalStatusBadge } from "../goals/goal-status";

export type GoalNextStep = {
  goalId: string;
  goalTitle: string;
  status: GoalStatusLevel;
  stepId: string;
  stepTitle: string;
};

/**
 * The next step of each active goal, to tick off right here. Ticking saves in
 * the background; the page then shows that goal's following step.
 */
export function GoalSteps({ steps }: { steps: GoalNextStep[] }) {
  const [done, markDone] = useOptimistic(new Set<string>(), (state, stepId: string) => new Set(state).add(stepId));
  const [error, setError] = useState<string | null>(null);

  function complete(stepId: string) {
    setError(null);
    startTransition(async () => {
      markDone(stepId);
      const result = await toggleStep({ stepId, done: true });
      if (result.errors.length > 0) setError(result.errors[0]);
    });
  }

  return (
    <section className="rounded-2xl border p-5 shadow-card">
      <h2 className="flex items-center gap-2 font-semibold">
        <Target className="size-4 text-primary" aria-hidden />
        Goal steps
      </h2>
      <ul className="mt-3 flex flex-col gap-1">
        {steps.map((step) => {
          const isDone = done.has(step.stepId);
          return (
            <li key={step.goalId} className="flex items-start gap-3 rounded-xl p-2">
              <button
                type="button"
                role="checkbox"
                aria-checked={isDone}
                aria-label={step.stepTitle}
                disabled={isDone}
                onClick={() => complete(step.stepId)}
                className={cn(
                  "mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border-2 outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                  isDone ? "border-success bg-success text-white" : "border-border hover:border-primary",
                )}
              >
                {isDone && <Check className="size-4" strokeWidth={3} />}
              </button>
              <div className="min-w-0 flex-1">
                <p className={cn("line-clamp-2 break-words", isDone && "text-muted-foreground line-through")}>
                  {step.stepTitle}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Link href={`/goals/${step.goalId}`} className="truncate text-xs text-muted-foreground hover:underline">
                    {step.goalTitle}
                  </Link>
                  {step.status !== "on_track" && <GoalStatusBadge status={step.status} />}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
