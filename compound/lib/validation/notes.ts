import { z } from "zod";
import { NOTE_COLORS } from "@/lib/notes/colors";

export const MAX_NOTE_TITLE = 120;
export const MAX_NOTE_BODY = 5000;

/** A note from the quick-add box (title only) or the full form (title and text). */
export const saveNoteSchema = z.object({
  id: z.uuid().optional(), // present when editing
  title: z
    .string()
    .trim()
    .min(1, { error: "Write something first." })
    .max(MAX_NOTE_TITLE, { error: `Keep the title under ${MAX_NOTE_TITLE} characters.` }),
  body: z
    .string()
    .trim()
    .max(MAX_NOTE_BODY, { error: `Keep the note under ${MAX_NOTE_BODY.toLocaleString("en-US")} characters.` })
    .optional()
    .transform((body) => (body ? body : null)),
  color: z.enum(NOTE_COLORS).optional(), // new notes default to yellow
});

export const setNoteDoneSchema = z.object({ id: z.uuid(), done: z.boolean() });
export const setNotePinnedSchema = z.object({ id: z.uuid(), pinned: z.boolean() });
export const deleteNoteSchema = z.object({ id: z.uuid() });
