import "server-only";
import type { Transaction } from "kysely";
import type { CalendarDate, Database } from "@/lib/db/types";
import { shouldCheckHabit } from "@/lib/lessons/rules";

/**
 * Marks a track day as done (inside the caller's transaction): sets
 * completed_at, checks off the track's habit for today if it's active and
 * scheduled, and marks the track completed once no day is left. Used for
 * finished lessons and for saved reading reflections alike.
 */
export async function completeTrackDay(
  trx: Transaction<Database>,
  { trackId, dayId, habitId, today }: { trackId: string; dayId: string; habitId: string | null; today: CalendarDate },
): Promise<void> {
  await trx
    .updateTable("track_days")
    .set({ completed_at: new Date() })
    .where("id", "=", dayId)
    .where("completed_at", "is", null)
    .execute();

  if (habitId) {
    const habit = await trx
      .selectFrom("habits")
      .select(["archived_at", "schedule"])
      .where("id", "=", habitId)
      .executeTakeFirst();
    const check = habit ? { archived: habit.archived_at !== null, schedule: habit.schedule } : null;
    if (shouldCheckHabit(check, today)) {
      await trx
        .insertInto("habit_checkins")
        .values({ habit_id: habitId, date: today })
        .onConflict((oc) => oc.columns(["habit_id", "date"]).doNothing())
        .execute();
    }
  }

  const remaining = await trx
    .selectFrom("track_days")
    .select("id")
    .where("track_id", "=", trackId)
    .where("completed_at", "is", null)
    .executeTakeFirst();
  if (!remaining) {
    await trx.updateTable("tracks").set({ status: "completed" }).where("id", "=", trackId).execute();
  }
}
