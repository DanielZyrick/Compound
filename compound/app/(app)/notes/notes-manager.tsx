"use client";

import { useState, useTransition } from "react";
import { Pencil, Pin, PinOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Note } from "@/lib/notes/queries";
import { MAX_NOTE_BODY, MAX_NOTE_TITLE } from "@/lib/validation/notes";
import { deleteNote, saveNote } from "./actions";
import { NoteRow } from "./note-row";
import { useNotes } from "./use-notes";

/** The Notes page list: tick, pin, edit and delete. */
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
      <ul className="divide-y rounded-2xl border px-4 shadow-card">
        {shown.map((note) => (
          <li key={note.id}>
            {editing === note.id ? (
              <NoteEditor note={note} onDone={() => setEditing(null)} />
            ) : confirming === note.id ? (
              <div className="flex flex-wrap items-center justify-between gap-2 py-3">
                <p className="text-sm">
                  Delete <strong className="break-words">{note.title}</strong>?
                </p>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setConfirming(null)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" size="sm" disabled={pending} onClick={() => remove(note.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ) : (
              <NoteRow
                note={note}
                onToggle={() => toggleDone(note)}
                clampBody={false}
                actions={
                  <>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={note.pinned ? `Unpin ${note.title}` : `Pin ${note.title}`}
                      onClick={() => togglePinned(note)}
                    >
                      {note.pinned ? <PinOff /> : <Pin />}
                    </Button>
                    <Button variant="ghost" size="icon-sm" aria-label={`Edit ${note.title}`} onClick={() => setEditing(note.id)}>
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
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
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error ?? actionError}
        </p>
      )}
    </>
  );
}

function NoteEditor({ note, onDone }: { note: Note; onDone: () => void }) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body ?? "");
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-2 py-3"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await saveNote({ id: note.id, title, body });
          setErrors(result.errors);
          if (result.errors.length === 0) onDone();
        });
      }}
    >
      <Input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Title" maxLength={MAX_NOTE_TITLE} autoFocus />
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        aria-label="Details (optional)"
        placeholder="Details (optional)"
        maxLength={MAX_NOTE_BODY}
        rows={4}
      />
      {errors.length > 0 && (
        <p role="alert" className="text-sm text-destructive">
          {errors[0]}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending || title.trim() === ""}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
