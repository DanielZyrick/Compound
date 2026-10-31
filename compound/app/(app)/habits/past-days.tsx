"use client";

import { startTransition, useOptimistic, useState } from "react";
import type { PastDay } from "@/lib/habits/fill-in";
import { cn } from "@/lib/utils";
import { setPastCheckin } from "./actions";

const WEEKDAY = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" });
const LONG = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });

function asDate(date: string) {
  return new Date(`${date}T00:00:00Z`);
}

/**
 * The last week for one habit. Tapping a day it was due fills it in (or
 * clears it); the change shows at once, then the server saves it.
 */
export function PastDays({ habitId, habitName, days }: { habitId: string; habitName: string; days: PastDay[] }) {
  const [shown, apply] = useOptimistic(days, (state, change: { date: string; done: boolean }) =>
    state.map((d) => (d.date === change.date ? { ...d, done: change.done } : d)),
  );
  const [error, setError] = useState<string | null>(null);

  function toggle(day: PastDay) {
    setError(null);
    startTransition(async () => {
      apply({ date: day.date, done: !day.done });
      const result = await setPastCheckin({ habitId, date: day.date, done: !day.done });
      if (result.errors.length > 0) setError(result.errors[0]);
    });
  }

  return (
    <div>
      <ol aria-label={`${habitName}, last 7 days`} className="grid grid-cols-7 gap-1">
        {shown.map((day) => (
          <li key={day.date}>
            <button
              type="button"
              aria-pressed={day.done}
              aria-label={`${habitName} on ${LONG.format(asDate(day.date))}`}
              disabled={!day.open}
              onClick={() => toggle(day)}
              className={cn(
                "flex w-full flex-col items-center gap-0.5 rounded-xl border py-1.5 text-center outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                day.done
                  ? "border-success bg-success text-white"
                  : day.open
                    ? "border-dashed border-muted-foreground/40 hover:border-foreground/60 hover:bg-muted"
                    : "border-transparent text-subtle",
              )}
            >
              <span aria-hidden className={cn("text-[11px]", !day.done && "text-muted-foreground")}>
                {WEEKDAY.format(asDate(day.date))}
              </span>
              <span aria-hidden className="text-sm font-semibold tabular-nums">
                {Number(day.date.slice(8))}
              </span>
            </button>
          </li>
        ))}
      </ol>
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
