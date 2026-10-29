"use client";

import { useState, useTransition } from "react";
import { Pencil, Pin, PinOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NOTE_COLORS, NOTE_PAPER, type NoteColor } from "@/lib/notes/colors";
import type { Note } from "@/lib/notes/queries";
import { cn } from "@/lib/utils";
import { MAX_NOTE_BODY, MAX_NOTE_TITLE } from "@/lib/validation/notes";
import { deleteNote, saveNote } from "./actions";
import { Paper, StickyNote } from "./sticky-note";
import { useNotes } from "./use-notes";

const ICON_BUTTON = "text-foreground/60 hover:bg-black/5 hover:text-foreground";

/** The Notes page board: tick, pin, recolour, edit and delete. */
export function NotesManager({ notes }: { notes: Note[] }) {
  const { shown, error, toggleDone, togglePinned } = useNotes(notes);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function remove(id: string) {
    setActionError(null);
    startTransition(async () => {
      const result = await deleteNote({ id });
      if (result.errors.length > 0) setActionError(result.errors[0]);
      setConfirming(null);
    });
  }

  return (
    <>
      <ul className="grid grid-cols-2 gap-4 pt-2 sm:gap-6 lg:grid-cols-3">
        {shown.map((note) => (
          <li key={note.id}>
            {editing === note.id ? (
              <NoteEditor note={note} onDone={() => setEditing(null)} />
            ) : confirming === note.id ? (
              <Paper note={note}>
                <p className="font-hand text-2xl leading-tight font-semibold break-words">Delete this note?</p>
                <p className="mt-1 line-clamp-2 text-sm text-foreground/75">{note.title}</p>
                <div className="mt-auto flex justify-end gap-2 pt-3">
                  <Button variant="ghost" size="sm" onClick={() => setConfirming(null)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" size="sm" disabled={pending} onClick={() => remove(note.id)}>
                    Delete
                  </Button>
                </div>
              </Paper>
            ) : (
              <StickyNote
                note={note}
                onToggle={() => toggleDone(note)}
                actions={
                  <>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className={ICON_BUTTON}
                      aria-label={note.pinned ? `Unpin ${note.title}` : `Pin ${note.title}`}
                      onClick={() => togglePinned(note)}
                    >
                      {note.pinned ? <PinOff /> : <Pin />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className={ICON_BUTTON}
                      aria-label={`Edit ${note.title}`}
                      onClick={() => setEditing(note.id)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className={ICON_BUTTON}
                      aria-label={`Delete ${note.title}`}
                      onClick={() => setConfirming(note.id)}
                    >
                      <Trash2 />
                    </Button>
                  </>
                }
              />
            )}
          </li>
        ))}
      </ul>
      {(error || actionError) && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error ?? actionError}
        </p>
      )}
    </>
  );
}

/** Editing happens on the note itself, in its colour. */
function NoteEditor({ note, onDone }: { note: Note; onDone: () => void }) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body ?? "");
  const [color, setColor] = useState<NoteColor>(note.color);
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  return (
    <Paper note={{ ...note, color }} className="rotate-0 hover:rotate-0">
      <form
        className="flex flex-1 flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const result = await saveNote({ id: note.id, title, body, color });
            setErrors(result.errors);
            if (result.errors.length === 0) onDone();
          });
        }}
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Title"
          maxLength={MAX_NOTE_TITLE}
          autoFocus
          className="w-full border-b border-foreground/20 bg-transparent font-hand text-2xl font-semibold outline-none focus:border-foreground/50"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          aria-label="Details (optional)"
          placeholder="Details (optional)"
          maxLength={MAX_NOTE_BODY}
          rows={4}
          className="w-full flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-foreground/40"
        />
        <div role="radiogroup" aria-label="Colour" className="flex gap-1.5">
          {NOTE_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={color === c}
              aria-label={NOTE_PAPER[c].label}
              onClick={() => setColor(c)}
              className={cn(
                "size-6 rounded-full border border-black/10 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                NOTE_PAPER[c].swatch,
                color === c && "ring-2 ring-foreground/60 ring-offset-1",
              )}
            />
          ))}
        </div>
        {errors.length > 0 && (
          <p role="alert" className="text-sm text-destructive">
            {errors[0]}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={pending || title.trim() === ""}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </Paper>
  );
}
