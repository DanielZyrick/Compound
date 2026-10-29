"use client";

import Link from "next/link";
import { StickyNote as StickyNoteIcon } from "lucide-react";
import type { Note } from "@/lib/notes/queries";
import { StickyNote } from "../notes/sticky-note";
import { QuickAddNote } from "../notes/quick-add";
import { useNotes } from "../notes/use-notes";

/** Pinned and recent notes as small sticky notes, with quick add. Editing lives on the Notes page. */
export function NotesCard({ notes, openCount }: { notes: Note[]; openCount: number }) {
  const { shown, error, toggleDone } = useNotes(notes);

  return (
    <section aria-labelledby="today-notes" className="rounded-2xl border p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <h2 id="today-notes" className="flex items-center gap-2 font-semibold">
          <StickyNoteIcon className="size-4 text-primary" aria-hidden />
          Notes
        </h2>
        <Link
          href="/notes"
          className="rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          See all{openCount > shown.filter((n) => !n.done).length ? ` ${openCount}` : ""}
        </Link>
      </div>

      <div className="mt-3">
        <QuickAddNote />
      </div>

      {shown.length > 0 && (
        <ul className="mt-5 grid grid-cols-2 gap-4">
          {shown.map((note) => (
            <li key={note.id}>
              <StickyNote note={note} onToggle={() => toggleDone(note)} small />
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
