import "server-only";
import { db } from "@/lib/db";
import type { CalendarDate } from "@/lib/db/types";
import { currentTrackDay } from "./progress";

/** The user's tracks, newest first, with which day of each is today. */
export async function getTracks(userId: string, today: CalendarDate) {
  const tracks = await db
    .selectFrom("tracks")
    .select(["id", "title", "type", "level", "total_days", "start_date", "status", "plan_source"])
    .where("user_id", "=", userId)
    .where("status", "!=", "archived")
    .orderBy("created_at", "desc")
    .execute();

  return tracks.map((t) => ({
    ...t,
    currentDay: currentTrackDay(t.start_date, today, t.total_days),
  }));
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

  return { ...track, days, currentDay: currentTrackDay(track.start_date, today, track.total_days) };
}
