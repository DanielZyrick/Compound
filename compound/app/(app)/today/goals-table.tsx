"use client";

import Link from "next/link";
import { startTransition, useOptimistic, useState } from "react";
import { Check, Plus, Target } from "lucide-react";
import type { GoalStatusLevel } from "@/lib/goals/schedule";
import { cn } from "@/lib/utils";
import { toggleStep } from "../goals/actions";
import { daysLeftLabel, GoalStatusBadge } from "../goals/goal-status";

export type GoalRow = {
  goalId: string;
  title: string;
  status: GoalStatusLevel;
  progress: number; // 0..1
  daysLeft: number;
  step: { id: string; title: string } | null;
};

/**
 * Active goals with their next step, to tick off right here, and their status.
 * Ticking saves in the background; the page then shows the following step.
 */
export function GoalsTable({ rows, total }: { rows: GoalRow[]; total: number }) {
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
    <section aria-labelledby="today-goals" className="overflow-hidden rounded-2xl border shadow-card">
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
        <h2 id="today-goals" className="flex items-center gap-2 font-semibold">
          <Target className="size-4 text-primary" aria-hidden />
          Goals
        </h2>
        <Link
          href="/goals"
          className="rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          See all{total > rows.length ? ` ${total}` : ""}
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="border-t px-5 py-8 text-center">
          <p className="font-medium">No active goals.</p>
          <p className="mt-1 text-sm text-muted-foreground">Break something big into steps you can take today.</p>
          <Link href="/goals/new" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            <Plus className="size-4" />
            New goal
          </Link>
        </div>
      ) : (
        <>
          {/* Column headings, on wider screens only; phones get stacked rows. */}
          <div
            aria-hidden
            className="hidden grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_9.5rem] gap-4 border-y bg-muted/50 px-5 py-2 text-xs font-medium text-muted-foreground sm:grid"
          >
            <span>Goal</span>
            <span>Next step</span>
            <span>Status</span>
          </div>
          <ul className="divide-y border-t sm:border-t-0">
            {rows.map((row) => (
              <li
                key={row.goalId}
                className="grid gap-2 px-5 py-3 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_9.5rem] sm:items-center sm:gap-4"
              >
                <div className="min-w-0">
                  <Link href={`/goals/${row.goalId}`} className="line-clamp-2 font-medium break-words hover:underline">
                    {row.title}
                  </Link>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {Math.round(row.progress * 100)}% · {daysLeftLabel(row.daysLeft)}
                  </p>
                </div>

                {row.step ? (
                  <NextStep step={row.step} done={done.has(row.step.id)} onDone={() => complete(row.step!.id)} />
                ) : (
                  <p className="text-sm text-muted-foreground">All steps done</p>
                )}

                <div>
                  <GoalStatusBadge status={row.status} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {error && (
        <p role="alert" className="border-t px-5 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}

function NextStep({ step, done, onDone }: { step: { id: string; title: string }; done: boolean; onDone: () => void }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={step.title}
        disabled={done}
        onClick={onDone}
        className={cn(
          "mt-px grid size-5 shrink-0 place-items-center rounded-md border-2 outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
          done ? "border-success bg-success text-white" : "border-border hover:border-primary",
        )}
      >
        {done && <Check className="size-3.5" strokeWidth={3} />}
      </button>
      <span className={cn("line-clamp-2 text-sm break-words", done && "text-muted-foreground line-through")}>
        {step.title}
      </span>
    </div>
  );
}
