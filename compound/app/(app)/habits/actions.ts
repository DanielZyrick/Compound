"use server";

import { refresh } from "next/cache";
import { requireOnboardedUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { MAX_ACTIVE_HABITS, saveHabitSchema, setArchivedSchema } from "@/lib/validation/habits";

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
