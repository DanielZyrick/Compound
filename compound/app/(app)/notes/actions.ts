"use server";

import { refresh } from "next/cache";
import { requireOnboardedUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { deleteNoteSchema, saveNoteSchema, setNoteDoneSchema, setNotePinnedSchema } from "@/lib/validation/notes";

export type NoteActionResult = { errors: string[] };

const SOMETHING_WRONG = "Something went wrong. Please refresh and try again.";
const GONE = "That note no longer exists.";

/** Plenty for notes and to-dos; stops runaway scripts filling the table. */
const MAX_NOTES = 500;

/** Adds a note, or edits one when `id` is given. */
export async function saveNote(input: unknown): Promise<NoteActionResult> {
  const user = await requireOnboardedUser();
  const parsed = saveNoteSchema.safeParse(input);
  if (!parsed.success) return { errors: [...new Set(parsed.error.issues.map((i) => i.message))] };
  const { id, title, body } = parsed.data;

  if (id) {
    const updated = await db
      .updateTable("notes")
      .set({ title, body, updated_at: new Date() })
      .where("id", "=", id)
      .where("user_id", "=", user.id)
      .executeTakeFirst();
    if (updated.numUpdatedRows === BigInt(0)) return { errors: [GONE] };
  } else {
    const { count } = await db
      .selectFrom("notes")
      .select((eb) => eb.fn.countAll<string>().as("count"))
      .where("user_id", "=", user.id)
      .executeTakeFirstOrThrow();
    if (Number(count) >= MAX_NOTES) {
      return { errors: [`You can keep up to ${MAX_NOTES} notes. Delete some you no longer need.`] };
    }
    await db.insertInto("notes").values({ user_id: user.id, title, body }).execute();
  }

  refresh();
  return { errors: [] };
}

/** Ticks a note off, or opens it again. */
export async function setNoteDone(input: unknown): Promise<NoteActionResult> {
  const user = await requireOnboardedUser();
  const parsed = setNoteDoneSchema.safeParse(input);
  if (!parsed.success) return { errors: [SOMETHING_WRONG] };

  const updated = await db
    .updateTable("notes")
    .set({ done_at: parsed.data.done ? new Date() : null })
    .where("id", "=", parsed.data.id)
    .where("user_id", "=", user.id)
    .executeTakeFirst();
  if (updated.numUpdatedRows === BigInt(0)) return { errors: [GONE] };

  refresh();
  return { errors: [] };
}

/** Pins a note to the top, or unpins it. */
export async function setNotePinned(input: unknown): Promise<NoteActionResult> {
  const user = await requireOnboardedUser();
  const parsed = setNotePinnedSchema.safeParse(input);
  if (!parsed.success) return { errors: [SOMETHING_WRONG] };

  const updated = await db
    .updateTable("notes")
    .set({ pinned: parsed.data.pinned })
    .where("id", "=", parsed.data.id)
    .where("user_id", "=", user.id)
    .executeTakeFirst();
  if (updated.numUpdatedRows === BigInt(0)) return { errors: [GONE] };

  refresh();
  return { errors: [] };
}

export async function deleteNote(input: unknown): Promise<NoteActionResult> {
  const user = await requireOnboardedUser();
  const parsed = deleteNoteSchema.safeParse(input);
  if (!parsed.success) return { errors: [SOMETHING_WRONG] };

  await db.deleteFrom("notes").where("id", "=", parsed.data.id).where("user_id", "=", user.id).execute();

  refresh();
  return { errors: [] };
}
