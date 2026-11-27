"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startPractice } from "./actions";

/** Asks the AI for a fresh exercise on a mistake; the page shows it once written. */
export function PracticeButton({
  lessonId,
  exerciseIndex,
  again,
}: {
  lessonId: string;
  exerciseIndex: number;
  again: boolean;
}) {
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  function start() {
    setErrors([]);
    startTransition(async () => {
      const response = await startPractice({ lessonId, exerciseIndex });
      setErrors(response.errors);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={start} disabled={pending} variant="outline" className="self-start">
        <Sparkles />
        {pending ? "Writing an exercise…" : again ? "Practice again" : "Practice this"}
      </Button>
      {errors.length > 0 && (
        <p role="alert" className="text-sm text-destructive">
          {errors.join(" ")}
        </p>
      )}
    </div>
  );
}
