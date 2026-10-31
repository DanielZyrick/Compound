"use server";

import { refresh } from "next/cache";
import { requireOnboardedUser } from "@/lib/auth/dal";
import { todayIn } from "@/lib/dates/calendar";
import { db } from "@/lib/db";
import { canFillIn, FILL_IN_DAYS } from "@/lib/habits/fill-in";
import {
  MAX_ACTIVE_HABITS,
  saveHabitSchema,
  setArchivedSchema,
  setPastCheckinSchema,
} from "@/lib/validation/habits";

export type HabitActionResult = { errors: string[] };

const LIMIT_MESSAGE = `You can have up to ${MAX_ACTIVE_HABITS} active habits. Archive one to make room.`;
const DUPLICATE_MESSAGE = "You already have an active habit with that name.";

function activeHabits(userId: string) {
  return db
    .selectFrom("habits")
    .select(["id", "name"])
    .where("user_id", "=", userId)
    .where("archived_at", "is", null)
    .execute();
}

function sameName(a: string, b: string) {
  return a.toLowerCase() === b.toLowerCase();
}

/** Adds a habit, or edits one when `id` is given. */
export async function saveHabit(input: unknown): Promise<HabitActionResult> {
  const user = await requireOnboardedUser();

  const parsed = saveHabitSchema.safeParse(input);
  if (!parsed.success) {
    return { errors: [...new Set(parsed.error.issues.map((issue) => issue.message))] };
  }
  const { id, name, schedule } = parsed.data;

  const active = await activeHabits(user.id);
  if (id && !active.some((h) => h.id === id)) return { errors: ["That habit no longer exists."] };
  if (!id && active.length >= MAX_ACTIVE_HABITS) return { errors: [LIMIT_MESSAGE] };
  if (active.some((h) => h.id !== id && sameName(h.name, name))) {
    return { errors: [DUPLICATE_MESSAGE] };
  }

  if (id) {
    // Changing the schedule keeps all check-ins; streaks use the new schedule.
    await db
      .updateTable("habits")
      .set({ name, schedule })
      .where("id", "=", id)
      .where("user_id", "=", user.id)
      .execute();
  } else {
    await db.insertInto("habits").values({ user_id: user.id, name, schedule }).execute();
  }

  refresh();
  return { errors: [] };
}

/**
 * Archives a habit (hides it, keeps its history) or restores it. Restoring
 * follows the same rules as adding: the limit and unique names.
 */
export async function setArchived(input: unknown): Promise<HabitActionResult> {
  const user = await requireOnboardedUser();

  const parsed = setArchivedSchema.safeParse(input);
  if (!parsed.success) return { errors: ["Something went wrong. Please try again."] };
  const { id, archived } = parsed.data;

  const habit = await db
    .selectFrom("habits")
    .select(["name", "archived_at"])
    .where("id", "=", id)
    .where("user_id", "=", user.id)
    .executeTakeFirst();
  if (!habit) return { errors: ["That habit no longer exists."] };

  if (!archived && habit.archived_at) {
    const active = await activeHabits(user.id);
    if (active.length >= MAX_ACTIVE_HABITS) return { errors: [LIMIT_MESSAGE] };
    if (active.some((h) => sameName(h.name, habit.name))) return { errors: [DUPLICATE_MESSAGE] };
  }

  await db
    .updateTable("habits")
    .set({ archived_at: archived ? new Date() : null })
    .where("id", "=", id)
    .where("user_id", "=", user.id)
    .execute();

  refresh();
  return { errors: [] };
}

/**
 * Fills in (or clears) a missed day. Only the owner's active habits, only
 * days in the last week the habit was due, and never a habit that finishing
 * a lesson checks off. "Today" comes from the user's timezone, not the browser.
 */
export async function setPastCheckin(input: unknown): Promise<HabitActionResult> {
  const user = await requireOnboardedUser();

  const parsed = setPastCheckinSchema.safeParse(input);
  if (!parsed.success) return { errors: ["Something went wrong. Please try again."] };
  const { habitId, date, done } = parsed.data;

  const habit = await db
    .selectFrom("habits")
    .select(["schedule", "created_at"])
    .where("id", "=", habitId)
    .where("user_id", "=", user.id)
    .where("archived_at", "is", null)
    .executeTakeFirst();
  if (!habit) return { errors: ["That habit no longer exists."] };

  const fromLesson = await db.selectFrom("tracks").select("id").where("habit_id", "=", habitId).executeTakeFirst();
  if (fromLesson) return { errors: ["This habit is checked off by finishing a lesson."] };

  const today = todayIn(user.timezone);
  const createdOn = todayIn(user.timezone, habit.created_at);
  if (!canFillIn({ schedule: habit.schedule, createdOn }, date, today)) {
    return { errors: [`You can only fill in days from the last ${FILL_IN_DAYS} days when the habit was due.`] };
  }

  if (done) {
    await db
      .insertInto("habit_checkins")
      .values({ habit_id: habitId, date })
      .onConflict((oc) => oc.columns(["habit_id", "date"]).doNothing())
      .execute();
  } else {
    await db.deleteFrom("habit_checkins").where("habit_id", "=", habitId).where("date", "=", date).execute();
  }

  refresh();
  return { errors: [] };
}
