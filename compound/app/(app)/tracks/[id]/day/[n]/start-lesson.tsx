"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startLesson } from "./actions";

export function StartLesson({ trackId, dayNumber, demoMode }: { trackId: string; dayNumber: number; demoMode: boolean }) {
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  function start() {
    setErrors([]);
    startTransition(async () => {
      const result = await startLesson({ trackId, dayNumber });
      setErrors(result.errors);
    });
  }

  return (
    <div className="rounded-2xl border border-dashed p-8 text-center">
      <p className="font-medium">Ready for today&apos;s lesson?</p>
      <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
        {pending
          ? demoMode
            ? "Preparing an example lesson…"
            : "The AI is writing your lesson. This can take up to 30 seconds."
          : demoMode
            ? "Demo mode: you'll get an example lesson."
            : "It's written for you the first time you open it, then saved."}
      </p>
      <Button onClick={start} disabled={pending} className="mt-4 h-10 px-5">
        <Sparkles />
        {pending ? "Writing your lesson…" : "Start lesson"}
      </Button>
      {errors.length > 0 && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {errors.join(" ")}
        </p>
      )}
    </div>
  );
}
