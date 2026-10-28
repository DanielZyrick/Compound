"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowRight, CircleCheck } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { completeLesson } from "./actions";

type Props = {
  trackId: string;
  dayNumber: number;
  completed: boolean;
  /** Every exercise has at least one attempt. */
  ready: boolean;
  hasHabit: boolean;
  /** The next day's number, if it's already open. */
  nextOpenDay: number | null;
};

export function CompleteLesson({ trackId, dayNumber, completed, ready, hasHabit, nextOpenDay }: Props) {
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  function complete() {
    setErrors([]);
    startTransition(async () => {
      const result = await completeLesson({ trackId, dayNumber });
      setErrors(result.errors);
    });
  }

  if (completed) {
    return (
      <div className="rounded-2xl border border-success/30 bg-success/10 p-5 text-center">
        <CircleCheck className="mx-auto size-6 text-success" />
        <p className="mt-2 font-medium">Lesson complete. Nice work!</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link href={`/tracks/${trackId}`} className={buttonVariants({ variant: "outline" })}>
            Back to the plan
          </Link>
          {nextOpenDay && (
            <Link href={`/tracks/${trackId}/day/${nextOpenDay}`} className={buttonVariants()}>
              Day {nextOpenDay}
              <ArrowRight />
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border p-5 text-center">
      <Button onClick={complete} disabled={!ready || pending} className="h-10 px-5">
        <CircleCheck />
        {pending ? "Saving…" : "Complete lesson"}
      </Button>
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {ready
          ? hasHabit
            ? "This also checks off the track's habit for today."
            : "Finish today's step."
          : "Answer every exercise to complete the lesson."}
      </p>
      {errors.length > 0 && (
        <p role="alert" className="text-sm text-destructive">
          {errors.join(" ")}
        </p>
      )}
    </div>
  );
}
