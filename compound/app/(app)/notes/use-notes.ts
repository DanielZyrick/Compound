"use client";

import { startTransition, useOptimistic, useState } from "react";
import type { Note } from "@/lib/notes/queries";
import { setNoteDone, setNotePinned } from "./actions";

type Change = { id: string } & Partial<Pick<Note, "done" | "pinned">>;

/**
 * Notes with instant ticks and pins: the change shows at once (optimistic),
 * then the server saves it and re-renders. If saving fails, it goes back.
 */
export function useNotes(notes: Note[]) {
  const [shown, apply] = useOptimistic(notes, (state, change: Change) =>
    state.map((n) => (n.id === change.id ? { ...n, ...change } : n)),
  );
  const [error, setError] = useState<string | null>(null);

  function run(change: Change, save: () => Promise<{ errors: string[] }>) {
    setError(null);
    startTransition(async () => {
      apply(change);
      const result = await save();
      if (result.errors.length > 0) setError(result.errors[0]);
    });
  }

  return {
    shown,
    error,
    toggleDone: (note: Note) => run({ id: note.id, done: !note.done }, () => setNoteDone({ id: note.id, done: !note.done })),
    togglePinned: (note: Note) =>
      run({ id: note.id, pinned: !note.pinned }, () => setNotePinned({ id: note.id, pinned: !note.pinned })),
  };
}
