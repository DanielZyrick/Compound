import "server-only";
import { db } from "@/lib/db";
import type { CalendarDate } from "@/lib/db/types";
import { currentTrackDay, nextTrackDay } from "./progress";

/** The user's tracks, newest first, with how many days of each are done. */
export async function getTracks(userId: string) {
  const tracks = await db
    .selectFrom("tracks")
    .leftJoin("track_days", "track_days.track_id", "tracks.id")
    .select((eb) => [
      "tracks.id",
      "tracks.title",
      "tracks.type",
      "tracks.level",
      "tracks.total_days",
      "tracks.status",
      "tracks.plan_source",
      eb.fn.count<string>("track_days.completed_at").as("doneDays"),
    ])
    .where("tracks.user_id", "=", userId)
    .where("tracks.status", "!=", "archived")
    .groupBy("tracks.id")
    .orderBy("tracks.created_at", "desc")
    .execute();

  return tracks.map((t) => ({ ...t, doneDays: Number(t.doneDays) }));
}

/** The day numbers of a track that are done, for the "open early" rule. */
export async function completedDayNumbers(trackId: string): Promise<Set<number>> {
  const rows = await db
    .selectFrom("track_days")
    .select("day_number")
    .where("track_id", "=", trackId)
    .where("completed_at", "is not", null)
    .execute();
  return new Set(rows.map((r) => r.day_number));
}

/** One of the user's tracks with its plan, or undefined if it isn't theirs. */
export async function getTrack(userId: string, trackId: string, today: CalendarDate) {
  const track = await db
    .selectFrom("tracks")
    .leftJoin("habits", "habits.id", "tracks.habit_id")
    .select([
      "tracks.id",
      "tracks.title",
      "tracks.topic",
      "tracks.type",
      "tracks.level",
      "tracks.total_days",
      "tracks.start_date",
      "tracks.status",
      "tracks.plan_source",
      "habits.name as habit_name",
    ])
    .where("tracks.id", "=", trackId)
    .where("tracks.user_id", "=", userId)
    .executeTakeFirst();
  if (!track) return undefined;

  const days = await db
    .selectFrom("track_days")
    .select(["day_number", "title", "summary", "completed_at"])
    .where("track_id", "=", trackId)
    .orderBy("day_number")
    .execute();

  const completedDays = new Set(days.filter((d) => d.completed_at !== null).map((d) => d.day_number));
  return {
    ...track,
    days,
    completedDays,
    calendarDay: currentTrackDay(track.start_date, today, track.total_days),
    nextDay: nextTrackDay(track.total_days, completedDays),
  };
}
