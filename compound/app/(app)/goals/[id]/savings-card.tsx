"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { centsToInput, formatMoney } from "@/lib/money/amount";
import { setGoalTarget } from "../actions";

type Props = {
  goalId: string;
  targetCents: number | null;
  savedCents: number;
  currency: string;
};

/**
 * Money toward the goal: saved so far (income put toward it on the Money
 * page) out of an optional target, which can be set, changed or removed.
 */
export function SavingsCard({ goalId, targetCents, savedCents, currency }: Props) {
  const [editing, setEditing] = useState(false);
  const [target, setTarget] = useState(targetCents ? centsToInput(targetCents) : "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await setGoalTarget({ goalId, target });
      if (result.errors.length > 0) setError(result.errors[0]);
      else setEditing(false);
    });
  }

  if (editing) {
    return (
      <section className="rounded-xl border p-5">
        <form onSubmit={save} className="flex flex-col gap-2">
          <Label htmlFor="goal-target">Savings target</Label>
          <div className="flex gap-2">
            <Input
              id="goal-target"
              inputMode="decimal"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="e.g. 50,000"
              autoFocus
              className="h-10"
            />
            <Button type="submit" disabled={pending} className="h-10">
              {pending ? "Saving…" : "Save"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(false)} className="h-10">
              Cancel
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Leave it empty to remove the target.</p>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </form>
      </section>
    );
  }

  if (targetCents === null) {
    return (
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed p-4">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <PiggyBank className="size-4" aria-hidden />
          Does this goal need money? Add a savings target.
        </p>
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          Add savings target
        </Button>
      </section>
    );
  }

  const percent = Math.min(100, Math.round((savedCents / targetCents) * 100));
  return (
    <section className="rounded-xl border p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <PiggyBank className="size-5 text-primary" aria-hidden />
          Savings
        </h2>
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
          Edit target
        </Button>
      </div>
      <p className="mt-2 text-sm">
        <span className="text-lg font-semibold tabular-nums">{formatMoney(savedCents, currency)}</span>{" "}
        <span className="text-muted-foreground">of {formatMoney(targetCents, currency)} saved</span>
      </p>
      <div
        role="progressbar"
        aria-label="Savings progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="mt-2 h-2 overflow-hidden rounded-full bg-secondary"
      >
        <div className="h-full rounded-full bg-success" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {savedCents >= targetCents ? (
          <>Target reached. Well done!</>
        ) : (
          <>
            {formatMoney(targetCents - savedCents, currency)} to go. Add income on the{" "}
            <Link href="/money?add=income#quick-add" className="text-primary hover:underline">
              Money page
            </Link>{" "}
            and put it toward this goal.
          </>
        )}
      </p>
    </section>
  );
}
