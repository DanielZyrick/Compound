"use client";

import { useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_NOTE_TITLE } from "@/lib/validation/notes";
import { saveNote } from "./actions";

/** One line and Enter: the fastest way to write something down. */
export function QuickAddNote({ placeholder = "Add a note or to-do…" }: { placeholder?: string }) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await saveNote({ title });
          if (result.errors.length > 0) {
            setError(result.errors[0]);
          } else {
            setTitle("");
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
        <Button type="submit" variant="outline" size="icon" aria-label="Add note" disabled={pending || title.trim() === ""}>
          <Plus />
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
