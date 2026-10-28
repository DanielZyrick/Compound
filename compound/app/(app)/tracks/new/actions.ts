"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AiError } from "@/lib/ai/errors";
import { runAiTask } from "@/lib/ai/run";
import { requireOnboardedUser } from "@/lib/auth/dal";
import { todayIn } from "@/lib/dates/calendar";
import { db } from "@/lib/db";
import type { TrackLevel, TrackType } from "@/lib/db/types";
import { findReadingPlan } from "@/lib/reading/plans";
import { shorten } from "@/lib/text";
import { demoPlan, PLAN_SYSTEM_PROMPT, planPrompt, trackPlanSchema } from "@/lib/tracks/plan";
import { MAX_ACTIVE_HABITS } from "@/lib/validation/habits";
import { MAX_ACTIVE_TRACKS, newTrackSchema } from "@/lib/validation/tracks";

export type CreateTrackState = { errors: string[] };

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6] as const;

/** Everything needed to save a new track, whichever kind it is. */
type TrackDraft = {
  title: string;
  topic: string;
  type: TrackType;
  level: TrackLevel | null;
  readingPlan: string | null;
  planSource: "ai" | "demo" | "fixed";
  days: { day: number; title: string; summary: string }[];
  /** The daily habit's name, if the user asked for one. */
  habitName: string | null;
};

/**
 * Creates a learning track. Skill and thinking tracks get a plan written by
 * the AI (or demo mode); reading tracks use a fixed plan and never call the
 * AI. The track, its days and an optional daily habit are saved together.
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
  const request = parsed.data;

  // Check the cheap limits first, so a request that can't be saved never
  // spends an AI call.
  const [activeTracks, activeHabits] = await Promise.all([
    db.selectFrom("tracks").select("id").where("user_id", "=", user.id).where("status", "=", "active").execute(),
    db.selectFrom("habits").select(["id", "name"]).where("user_id", "=", user.id).where("archived_at", "is", null).execute(),
  ]);
  if (activeTracks.length >= MAX_ACTIVE_TRACKS) {
    return { errors: [`You can have up to ${MAX_ACTIVE_TRACKS} active tracks. Finish or archive one first.`] };
  }
  if (request.addHabit && activeHabits.length >= MAX_ACTIVE_HABITS) {
    return {
      errors: [`You already have ${MAX_ACTIVE_HABITS} active habits. Untick "Add a daily habit" or archive a habit.`],
    };
  }

  let draft: TrackDraft;
  if (request.type === "reading") {
    const plan = findReadingPlan(request.readingPlan);
    if (!plan) return { errors: ["Choose a reading plan."] };
    draft = {
      title: plan.title,
      topic: plan.title,
      type: "reading",
      level: null,
      readingPlan: plan.id,
      planSource: "fixed",
      days: plan.days.map((d) => ({
        day: d.day,
        title: d.passage,
        summary: `Read ${d.passage}, then write a short reflection.`,
      })),
      habitName: request.addHabit ? `Read: ${plan.title}` : null,
    };
  } else {
    const { topic, type, level, totalDays } = request;
    const focus = await db
      .selectFrom("focus_areas")
      .select("description")
      .where("user_id", "=", user.id)
      .orderBy("created_at", "desc")
      .executeTakeFirst();
    const planRequest = { topic, type, level, totalDays, focus: focus?.description };

    try {
      const { data: plan, source } = await runAiTask({
        user,
        purpose: "track_plan",
        tier: "smart",
        schema: trackPlanSchema(totalDays),
        system: PLAN_SYSTEM_PROMPT,
        prompt: planPrompt(planRequest),
        demo: () => demoPlan(planRequest),
      });
      draft = {
        title: plan.title,
        topic,
        type,
        level,
        readingPlan: null,
        planSource: source,
        days: plan.days,
        habitName: request.addHabit ? `Learn: ${plan.title}` : null,
      };
    } catch (error) {
      if (error instanceof AiError) return { errors: [error.userMessage] };
      throw error;
    }
  }

  const trackId = await saveTrack(user, draft, activeHabits);
  revalidatePath("/tracks");
  revalidatePath("/today");
  redirect(`/tracks/${trackId}`);
}

async function saveTrack(
  user: { id: string; timezone: string },
  draft: TrackDraft,
  activeHabits: { id: string; name: string }[],
): Promise<string> {
  return db.transaction().execute(async (trx) => {
    let habitId: string | null = null;
    if (draft.habitName) {
      // Reuse an active habit with the same name instead of adding a duplicate.
      const name = shorten(draft.habitName, 60); // habit names are at most 60 characters
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
        title: draft.title,
        topic: draft.topic,
        type: draft.type,
        level: draft.level,
        reading_plan: draft.readingPlan,
        total_days: draft.days.length,
        start_date: todayIn(user.timezone),
        habit_id: habitId,
        plan_source: draft.planSource,
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    await trx
      .insertInto("track_days")
      .values(
        draft.days.map((d) => ({ track_id: track.id, day_number: d.day, title: d.title, summary: d.summary })),
      )
      .execute();

    return track.id;
  });
}
