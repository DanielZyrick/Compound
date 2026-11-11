import "server-only";
import { todayIn } from "@/lib/dates/calendar";
import { sql } from "kysely";
import { db } from "@/lib/db";
import type { CalendarDate } from "@/lib/db/types";
import type { NoteColor } from "./colors";

export type Note = {
  id: string;
  title: string;
  body: string | null;
  pinned: boolean;
  done: boolean;
  color: NoteColor;
  dueOn: CalendarDate | null;
};

export type NoteFilter = "open" | "done" | "all";

function notes(userId: string) {
  return db
    .selectFrom("notes")
    .select(["id", "title", "body", "pinned", "color", "done_at", "due_on"])
    .where("user_id", "=", userId);
}

function toNote(row: {
  id: string;
  title: string;
  body: string | null;
  pinned: boolean;
  color: NoteColor;
  done_at: Date | null;
  due_on: CalendarDate | null;
}): Note {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    pinned: row.pinned,
    color: row.color,
    done: row.done_at !== null,
    dueOn: row.due_on,
  };
}

/** The Notes page: open notes first; pinned at the top, then by due date (soonest first), then newest. */
export async function getNotes(userId: string, filter: NoteFilter): Promise<Note[]> {
  let query = notes(userId);
  if (filter === "open") query = query.where("done_at", "is", null);
  if (filter === "done") query = query.where("done_at", "is not", null);
  const rows = await query
    .orderBy((eb) => eb("done_at", "is not", null)) // open (false) before done (true)
    .orderBy("pinned", "desc")
    .orderBy(sql`due_on asc nulls last`)
    .orderBy("updated_at", "desc")
    .execute();
  return rows.map(toNote);
}

/**
 * The Today card: up to `limit` open notes (overdue and due today first, then
 * pinned, then newest), plus the ones ticked off today, so a tick stays
 * visible for the rest of the day. `dueCount` is how many open notes are
 * overdue or due today.
 */
export async function getTodayNotes(user: { id: string; timezone: string }, today: CalendarDate, limit = 4) {
  const [open, recentlyDone, counts] = await Promise.all([
    notes(user.id)
      .where("done_at", "is", null)
      .orderBy(sql`(due_on is not null and due_on <= ${today}) desc`)
      .orderBy(sql`case when due_on <= ${today} then due_on end asc`)
      .orderBy("pinned", "desc")
      .orderBy("updated_at", "desc")
      .limit(limit)
      .execute(),
    notes(user.id).where("done_at", "is not", null).orderBy("done_at", "desc").limit(limit).execute(),
    db
      .selectFrom("notes")
      .select((eb) => [
        eb.fn.countAll<string>().as("open"),
        eb.fn.countAll<string>().filterWhere("due_on", "<=", today).as("due"),
      ])
      .where("user_id", "=", user.id)
      .where("done_at", "is", null)
      .executeTakeFirstOrThrow(),
  ]);
  const doneToday = recentlyDone.filter((n) => n.done_at && todayIn(user.timezone, n.done_at) === today);
  return {
    notes: [...open, ...doneToday].slice(0, limit).map(toNote),
    openCount: Number(counts.open),
    dueCount: Number(counts.due),
  };
}

/** Whether any open note is overdue or due today: the sidebar's attention dot on Notes. */
export async function notesNeedAttention(userId: string, today: CalendarDate): Promise<boolean> {
  const row = await db
    .selectFrom("notes")
    .select("id")
    .where("user_id", "=", userId)
    .where("done_at", "is", null)
    .where("due_on", "<=", today)
    .limit(1)
    .executeTakeFirst();
  return row !== undefined;
}
