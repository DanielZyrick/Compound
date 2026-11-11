"use client";

import { useRef, useState, useTransition } from "react";
import { CalendarClock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MAX_NOTE_TITLE } from "@/lib/validation/notes";
import { saveNote } from "./actions";

/** The date on this device, `days` from now, as YYYY-MM-DD. */
function localDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** One line and Enter: the fastest way to write something down. A due date is optional. */
export function QuickAddNote({ placeholder = "Add a note or to-do…" }: { placeholder?: string }) {
  const [title, setTitle] = useState("");
  const [dueOn, setDueOn] = useState("");
  const [showDue, setShowDue] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await saveNote({ title, ...(dueOn && { dueOn }) });
          if (result.errors.length > 0) {
            setError(result.errors[0]);
          } else {
            setTitle("");
            setDueOn("");
            setShowDue(false);
            input.current?.focus();
          }
        });
      }}
    >
      <div className="flex gap-2">
        <Input
          ref={input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={placeholder}
          aria-label="New note"
          maxLength={MAX_NOTE_TITLE}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Set a due date"
          aria-expanded={showDue}
          onClick={() => setShowDue((shown) => !shown)}
          className={cn(dueOn && "border-primary text-primary")}
        >
          <CalendarClock />
        </Button>
        <Button type="submit" variant="outline" size="icon" aria-label="Add note" disabled={pending || title.trim() === ""}>
          <Plus />
        </Button>
      </div>
      {showDue && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <label className="flex items-center gap-2 text-muted-foreground">
            Due
            <input
              type="date"
              value={dueOn}
              onChange={(e) => setDueOn(e.target.value)}
              className="rounded-lg border border-input bg-card px-2 py-1 text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </label>
          <Button type="button" variant="ghost" size="sm" onClick={() => setDueOn(localDate(0))}>
            Today
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setDueOn(localDate(1))}>
            Tomorrow
          </Button>
          {dueOn && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setDueOn("")}>
              Clear
            </Button>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-1.5 text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
