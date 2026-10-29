"use client";

import { Check, Pin } from "lucide-react";
import { NOTE_PAPER, tiltFor } from "@/lib/notes/colors";
import type { Note } from "@/lib/notes/queries";
import { cn } from "@/lib/utils";

/** The paper itself: colour, slight tilt, shadow and a folded corner. */
export function Paper({
  note,
  small = false,
  className,
  children,
}: {
  note: Pick<Note, "id" | "color" | "pinned">;
  small?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <article
      data-color={note.color}
      className={cn(
        "relative flex flex-col rounded-[3px] border shadow-[0_1px_1px_rgba(0,0,0,0.05),0_10px_18px_-8px_rgba(0,0,0,0.25)] transition-transform duration-200 hover:rotate-0",
        NOTE_PAPER[note.color].paper,
        tiltFor(note.id),
        small ? "min-h-32 p-3 pt-4" : "min-h-40 p-3 pt-4 sm:min-h-48 sm:p-4 sm:pt-5",
        className,
      )}
    >
      {note.pinned && (
        <Pin
          aria-label="Pinned"
          className="absolute -top-2.5 left-1/2 size-5 -translate-x-1/2 rotate-12 fill-red-500 text-red-700 drop-shadow"
        />
      )}
      {children}
      {/* The folded corner. */}
      <span
        aria-hidden
        className="pointer-events-none absolute right-0 bottom-0 size-5 rounded-tl-md bg-gradient-to-tl from-black/10 via-black/5 to-transparent"
      />
    </article>
  );
}

/** A note on its paper, with the tick circle at the bottom and `actions` beside it. */
export function StickyNote({
  note,
  onToggle,
  actions,
  small = false,
}: {
  note: Note;
  onToggle: () => void;
  actions?: React.ReactNode;
  small?: boolean;
}) {
  return (
    <Paper note={note} small={small} className={cn(note.done && "opacity-60")}>
      <h3
        className={cn(
          "font-hand leading-tight font-semibold break-words",
          small ? "line-clamp-3 text-xl" : "text-xl sm:text-2xl",
          note.done && "line-through",
        )}
      >
        {note.title}
      </h3>
      {note.body && (
        <p
          className={cn(
            "mt-1.5 text-sm break-words whitespace-pre-line text-foreground/75",
            small ? "line-clamp-2" : "line-clamp-6",
            note.done && "line-through",
          )}
        >
          {note.body}
        </p>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 pt-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={note.done}
          aria-label={note.title}
          onClick={onToggle}
          className={cn(
            "grid size-6 shrink-0 place-items-center rounded-full border-2 outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
            note.done ? "border-foreground/70 bg-foreground/70 text-white" : "border-foreground/30 hover:border-foreground/60",
          )}
        >
          {note.done && <Check className="size-3.5" strokeWidth={3} />}
        </button>
        {actions && <div className="flex items-center gap-0.5">{actions}</div>}
      </div>
    </Paper>
  );
}
