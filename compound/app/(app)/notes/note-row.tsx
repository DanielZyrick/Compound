"use client";

import { Check, Pin } from "lucide-react";
import type { Note } from "@/lib/notes/queries";
import { cn } from "@/lib/utils";

/** A note with its tick circle. `actions` (pin, edit, delete) sit on the right. */
export function NoteRow({
  note,
  onToggle,
  actions,
  clampBody = true,
}: {
  note: Note;
  onToggle: () => void;
  actions?: React.ReactNode;
  /** Show only the first two lines of the text. */
  clampBody?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <button
        type="button"
        role="checkbox"
        aria-checked={note.done}
        aria-label={note.title}
        onClick={onToggle}
        className={cn(
          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
          note.done ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary",
        )}
      >
        {note.done && <Check className="size-3" strokeWidth={3} />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn("flex items-center gap-1.5 font-medium break-words", note.done && "text-muted-foreground line-through")}>
          {note.pinned && <Pin className="size-3.5 shrink-0 fill-current text-primary" aria-label="Pinned" />}
          <span className="min-w-0">{note.title}</span>
        </p>
        {note.body && (
          <p
            className={cn(
              "mt-0.5 text-sm break-words whitespace-pre-line text-muted-foreground",
              clampBody && "line-clamp-2",
              note.done && "line-through",
            )}
          >
            {note.body}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-0.5">{actions}</div>}
    </div>
  );
}
