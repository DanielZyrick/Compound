"use server";

import { redirect } from "next/navigation";
import { AiError } from "@/lib/ai/errors";
import { runAiTask } from "@/lib/ai/run";
import { requireOnboardedUser } from "@/lib/auth/dal";
import { todayIn } from "@/lib/dates/calendar";
import { db } from "@/lib/db";
import { demoPlan, PLAN_SYSTEM_PROMPT, planPrompt, trackPlanSchema } from "@/lib/tracks/plan";
import { MAX_ACTIVE_HABITS } from "@/lib/validation/habits";
import { MAX_ACTIVE_TRACKS, newTrackSchema } from "@/lib/validation/tracks";

export type CreateTrackState = { errors: string[] };

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6] as const;

/**
 * Creates a learning track: the AI (or demo mode) writes the day-by-day plan,
 * then the track, its days and an optional daily habit are saved together.
 */
export async function createTrack(
  _previous: CreateTrackState,
  input: unknown, // from the browser: untrusted until validated
): Promise<CreateTrackState> {
  const user = await requireOnboardedUser();

  const parsed = newTrackSchema.safeParse(input);
  if (!parsed.success) {
    return { errors: [...new Set(parsed.error.issues.map((issue) => issue.message))] };
  }
  const { topic, type, level, totalDays, addHabit } = parsed.data;

  // Check the cheap limits first, so a request that can't be saved never
  // spends an AI call.
  const [activeTracks, activeHabits, focus] = await Promise.all([
    db.selectFrom("tracks").select("id").where("user_id", "=", user.id).where("status", "=", "active").execute(),
    db.selectFrom("habits").select(["id", "name"]).where("user_id", "=", user.id).where("archived_at", "is", null).execute(),
    db.selectFrom("focus_areas").select("description").where("user_id", "=", user.id).orderBy("created_at", "desc").executeTakeFirst(),
  ]);
  if (activeTracks.length >= MAX_ACTIVE_TRACKS) {
    return { errors: [`You can have up to ${MAX_ACTIVE_TRACKS} active tracks. Finish or archive one first.`] };
  }
  if (addHabit && activeHabits.length >= MAX_ACTIVE_HABITS) {
    return {
      errors: [`You already have ${MAX_ACTIVE_HABITS} active habits. Untick "Add a daily habit" or archive a habit.`],
    };
  }

  const request = { topic, type, level, totalDays, focus: focus?.description };
  let plan;
  let source;
  try {
    ({ data: plan, source } = await runAiTask({
      user,
      purpose: "track_plan",
      tier: "smart",
      schema: trackPlanSchema(totalDays),
      system: PLAN_SYSTEM_PROMPT,
      prompt: planPrompt(request),
      demo: () => demoPlan(request),
    }));
  } catch (error) {
    if (error instanceof AiError) return { errors: [error.userMessage] };
    throw error;
  }

  const trackId = await db.transaction().execute(async (trx) => {
    let habitId: string | null = null;
    if (addHabit) {
      // Reuse an active habit with the same name instead of adding a duplicate.
      const name = `Learn: ${plan.title}`.slice(0, 60);
      const existing = activeHabits.find((h) => h.name.toLowerCase() === name.toLowerCase());
      habitId =
        existing?.id ??
        (
          await trx
            .insertInto("habits")
            .values({ user_id: user.id, name, schedule: [...EVERY_DAY] })
            .returning("id")
            .executeTakeFirstOrThrow()
        ).id;
    }

    const track = await trx
      .insertInto("tracks")
      .values({
        user_id: user.id,
        title: plan.title,
        topic,
        type,
        level,
        total_days: totalDays,
        start_date: todayIn(user.timezone),
        habit_id: habitId,
        plan_source: source,
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    await trx
      .insertInto("track_days")
      .values(
        plan.days.map((d) => ({ track_id: track.id, day_number: d.day, title: d.title, summary: d.summary })),
      )
      .execute();

    return track.id;
  });

  redirect(`/tracks/${trackId}`);
}
