"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowRight, CircleCheck } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveReadingReflection } from "./actions";

type Props = {
  trackId: string;
  dayNumber: number;
  prompt: string;
  saved: string | null;
  completed: boolean;
  hasHabit: boolean;
  nextOpenDay: number | null;
};

/** The reflection journal for a reading day. Saving it the first time completes the day. */
export function ReadingReflection({ trackId, dayNumber, prompt, saved, completed, hasHabit, nextOpenDay }: Props) {
  const [text, setText] = useState(saved ?? "");
  const [editing, setEditing] = useState(saved === null);
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  function save() {
    setErrors([]);
    startTransition(async () => {
      const result = await saveReadingReflection({ trackId, dayNumber, text });
      if (result.errors.length > 0) return setErrors(result.errors);
      setEditing(false);
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border p-5">
      <Label htmlFor="reflection" className="text-base leading-snug font-semibold">
        {prompt}
      </Label>

      {editing ? (
        <>
          <Textarea
            id="reflection"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write in your own words…"
            maxLength={5000}
            disabled={pending}
            className="min-h-32"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              {completed
                ? "Only you can see your reflections."
                : hasHabit
                  ? "Saving completes today's reading and checks off its habit."
                  : "Saving completes today's reading."}
            </span>
            <div className="flex gap-2">
              {saved !== null && (
                <Button variant="ghost" onClick={() => setEditing(false)} disabled={pending}>
                  Cancel
                </Button>
              )}
              <Button onClick={save} disabled={pending || text.trim().length === 0}>
                {pending ? "Saving…" : completed ? "Save changes" : "Save and complete"}
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-lg bg-muted/50 p-3 text-sm">
          <p className="whitespace-pre-line">{text}</p>
          <button type="button" onClick={() => setEditing(true)} className="mt-2 text-primary hover:underline">
            Edit
          </button>
        </div>
      )}

      {errors.length > 0 && (
        <p role="alert" className="text-sm text-destructive">
          {errors.join(" ")}
        </p>
      )}

      {completed && !editing && (
        <div className="mt-2 flex flex-col items-center gap-3 rounded-xl border border-success/30 bg-success/10 p-4 text-center">
          <p className="flex items-center gap-2 font-medium">
            <CircleCheck className="size-5 text-success" />
            Reading complete. Well done!
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href={`/tracks/${trackId}`} className={buttonVariants({ variant: "outline" })}>
              Back to the plan
            </Link>
            {nextOpenDay && (
              <Link href={`/tracks/${trackId}/day/${nextOpenDay}`} className={buttonVariants()}>
                Continue to day {nextOpenDay}
                <ArrowRight />
              </Link>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
