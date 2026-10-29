import "server-only";
import { todayIn } from "@/lib/dates/calendar";
import { db } from "@/lib/db";
import type { CalendarDate } from "@/lib/db/types";

export type Note = { id: string; title: string; body: string | null; pinned: boolean; done: boolean };

export type NoteFilter = "open" | "done" | "all";

function notes(userId: string) {
  return db
    .selectFrom("notes")
    .select(["id", "title", "body", "pinned", "done_at"])
    .where("user_id", "=", userId);
}

function toNote(row: { id: string; title: string; body: string | null; pinned: boolean; done_at: Date | null }): Note {
  return { id: row.id, title: row.title, body: row.body, pinned: row.pinned, done: row.done_at !== null };
}

/** The Notes page: open notes first, pinned at the top, newest first. */
export async function getNotes(userId: string, filter: NoteFilter): Promise<Note[]> {
  let query = notes(userId);
  if (filter === "open") query = query.where("done_at", "is", null);
  if (filter === "done") query = query.where("done_at", "is not", null);
  const rows = await query
    .orderBy((eb) => eb("done_at", "is not", null)) // open (false) before done (true)
    .orderBy("pinned", "desc")
    .orderBy("updated_at", "desc")
    .execute();
  return rows.map(toNote);
}

/**
 * The Today card: up to `limit` open notes (pinned first, then newest), plus
 * the ones ticked off today, so a tick stays visible for the rest of the day.
 */
export async function getTodayNotes(user: { id: string; timezone: string }, today: CalendarDate, limit = 5) {
  const [open, recentlyDone, openCount] = await Promise.all([
    notes(user.id)
      .where("done_at", "is", null)
      .orderBy("pinned", "desc")
      .orderBy("updated_at", "desc")
      .limit(limit)
      .execute(),
    notes(user.id).where("done_at", "is not", null).orderBy("done_at", "desc").limit(limit).execute(),
    db
      .selectFrom("notes")
      .select((eb) => eb.fn.countAll<string>().as("count"))
      .where("user_id", "=", user.id)
      .where("done_at", "is", null)
      .executeTakeFirstOrThrow(),
  ]);
  const doneToday = recentlyDone.filter((n) => n.done_at && todayIn(user.timezone, n.done_at) === today);
  return {
    notes: [...open, ...doneToday].slice(0, limit).map(toNote),
    openCount: Number(openCount.count),
  };
}
