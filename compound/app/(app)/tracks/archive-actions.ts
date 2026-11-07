"use server";

import { refresh, revalidatePath } from "next/cache";
import { requireOnboardedUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { findDuplicate } from "@/lib/tracks/duplicate";
import { MAX_ACTIVE_HABITS } from "@/lib/validation/habits";
import { MAX_ACTIVE_TRACKS, setTrackArchivedSchema } from "@/lib/validation/tracks";

export type ArchiveTrackResult = { errors: string[] };

/**
 * Archives a track: it leaves Learn and Today, and its history is kept. Its
 * daily habit is archived too, unless another active track uses it.
 * Restoring follows the same rules as creating: the track limit and one
 * active track per topic. A finished track comes back as finished.
 */
export async function setTrackArchived(input: unknown): Promise<ArchiveTrackResult> {
  const user = await requireOnboardedUser();
  const parsed = setTrackArchivedSchema.safeParse(input);
  if (!parsed.success) return { errors: ["Something went wrong. Please refresh and try again."] };
  const { id, archived } = parsed.data;

  const track = await db
    .selectFrom("tracks")
    .select(["id", "topic", "type", "status", "habit_id", "total_days"])
    .where("id", "=", id)
    .where("user_id", "=", user.id)
    .executeTakeFirst();
  if (!track) return { errors: ["That track no longer exists."] };

  if (archived) {
    if (track.status === "archived") return { errors: [] };
    await db.transaction().execute(async (trx) => {
      await trx.updateTable("tracks").set({ status: "archived" }).where("id", "=", id).execute();
      if (track.habit_id) {
        const shared = await trx
          .selectFrom("tracks")
          .select("id")
          .where("habit_id", "=", track.habit_id)
          .where("status", "!=", "archived")
          .executeTakeFirst();
        if (!shared) {
          await trx
            .updateTable("habits")
            .set({ archived_at: new Date() })
            .where("id", "=", track.habit_id)
            .where("archived_at", "is", null)
            .execute();
        }
      }
    });
  } else {
    if (track.status !== "archived") return { errors: [] };
    const active = await db
      .selectFrom("tracks")
      .select(["id", "title", "topic", "type"])
      .where("user_id", "=", user.id)
      .where("status", "=", "active")
      .execute();
    const duplicate = findDuplicate(active, track);
    if (duplicate) return { errors: [`You already have an active track for "${duplicate.title}". Archive it first.`] };

    const { count: doneDays } = await db
      .selectFrom("track_days")
      .select((eb) => eb.fn.count<string>("completed_at").as("count"))
      .where("track_id", "=", id)
      .executeTakeFirstOrThrow();
    const finished = Number(doneDays) >= track.total_days;
    if (!finished && active.length >= MAX_ACTIVE_TRACKS) {
      return { errors: [`You can have up to ${MAX_ACTIVE_TRACKS} active tracks. Archive one first.`] };
    }

    await db.transaction().execute(async (trx) => {
      await trx
        .updateTable("tracks")
        .set({ status: finished ? "completed" : "active" })
        .where("id", "=", id)
        .execute();
      // Bring its habit back too, when there's room for it.
      if (track.habit_id) {
        const { count } = await trx
          .selectFrom("habits")
          .select((eb) => eb.fn.countAll<string>().as("count"))
          .where("user_id", "=", user.id)
          .where("archived_at", "is", null)
          .executeTakeFirstOrThrow();
        if (Number(count) < MAX_ACTIVE_HABITS) {
          await trx.updateTable("habits").set({ archived_at: null }).where("id", "=", track.habit_id).execute();
        }
      }
    });
  }

  revalidatePath("/tracks");
  revalidatePath("/today");
  refresh();
  return { errors: [] };
}
