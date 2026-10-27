"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireOnboardedUser } from "@/lib/auth/dal";
import { todayIn, weekdayOf } from "@/lib/dates/calendar";
import { db } from "@/lib/db";

const checkinSchema = z.object({ habitId: z.uuid(), done: z.boolean() });

/**
 * Checks a habit off for today, or unchecks it. "Today" is decided here from
 * the user's timezone, never by the browser.
 */
export async function setCheckin(input: unknown): Promise<{ ok: boolean }> {
  const user = await requireOnboardedUser();

  const parsed = checkinSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const { habitId, done } = parsed.data;

  const today = todayIn(user.timezone);

  // Only the owner's active habits, and only on days they're scheduled.
  const habit = await db
    .selectFrom("habits")
    .select("schedule")
    .where("id", "=", habitId)
    .where("user_id", "=", user.id)
    .where("archived_at", "is", null)
    .executeTakeFirst();
  if (!habit || !habit.schedule.includes(weekdayOf(today))) return { ok: false };

  if (done) {
    // Checking twice (e.g. two tabs) is harmless: the unique (habit_id, date) wins.
    await db
      .insertInto("habit_checkins")
      .values({ habit_id: habitId, date: today })
      .onConflict((oc) => oc.columns(["habit_id", "date"]).doNothing())
      .execute();
  } else {
    await db
      .deleteFrom("habit_checkins")
      .where("habit_id", "=", habitId)
      .where("date", "=", today)
      .execute();
  }

  // Re-render the page with fresh streaks and counts.
  refresh();
  return { ok: true };
}
