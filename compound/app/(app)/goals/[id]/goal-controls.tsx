"use client";

import { useState, useTransition } from "react";
import { Archive, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addDays } from "@/lib/dates/calendar";
import { archiveGoal, extendDeadline } from "../actions";

/** Move the deadline later: offered when the goal is at risk. */
export function ExtendDeadline({ goalId, deadline }: { goalId: string; deadline: string }) {
  const [date, setDate] = useState(addDays(deadline, 7));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await extendDeadline({ goalId, deadline: date });
          if (result.errors.length > 0) setError(result.errors[0]);
        });
      }}
      className="mt-3 flex flex-wrap items-end gap-2"
    >
      <div className="flex flex-col gap-1">
        <Label htmlFor="new-deadline" className="text-xs">
          New deadline
        </Label>
        <Input
          id="new-deadline"
          type="date"
          value={date}
          min={addDays(deadline, 1)}
          onChange={(e) => setDate(e.target.value)}
          className="h-9 w-44 bg-background"
        />
      </div>
      <Button type="submit" variant="outline" disabled={pending} className="h-9">
        <CalendarClock />
        {pending ? "Saving…" : "Extend deadline"}
      </Button>
      {error && (
        <p role="alert" className="w-full text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}

/** Archive with a second click to confirm, since archived goals leave the lists. */
export function ArchiveGoal({ goalId }: { goalId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <Button variant="ghost" className="text-muted-foreground" onClick={() => setConfirming(true)}>
        <Archive />
        Archive goal
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span>Archive this goal? It will be hidden from your lists.</span>
      <Button
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await archiveGoal({ goalId }); // redirects to /goals when it succeeds
          })
        }
      >
        {pending ? "Archiving…" : "Archive"}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
        Cancel
      </Button>
    </div>
  );
}
