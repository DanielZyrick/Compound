"use server";

import { z } from "zod";
import { AiError } from "@/lib/ai/errors";
import { runAiTask } from "@/lib/ai/run";
import { requireOnboardedUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { getLearnerContext } from "@/lib/profile/queries";
import { getRecommendations } from "@/lib/recommendations/queries";
import {
  demoRecommendations,
  RECOMMEND_SYSTEM_PROMPT,
  recommendationsSchema,
  recommendPrompt,
  type StoredRecommendations,
} from "@/lib/recommendations/recommend";

export type LoadRecommendationsResult = { saved: StoredRecommendations | null; error: string | null };

const inputSchema = z.object({ fresh: z.boolean() }).optional();

/**
 * Suggestions for the user: the saved ones if they still match the profile,
 * otherwise written once (smart model) and saved. With `fresh`, always writes
 * new ones that avoid the current ideas ("Suggest others"). Called by the card
 * after the page is on screen, so rendering never spends an AI call.
 */
export async function loadRecommendations(input?: unknown): Promise<LoadRecommendationsResult> {
  const user = await requireOnboardedUser();
  const fresh = inputSchema.safeParse(input).data?.fresh ?? false;

  const state = await getRecommendations(user.id);
  if (state.status === "no-profile") return { saved: null, error: null };
  if (state.status === "ready" && !fresh) return { saved: state.saved, error: null };

  const [learner, tracks] = await Promise.all([
    getLearnerContext(user.id),
    db.selectFrom("tracks").select("title").where("user_id", "=", user.id).where("status", "=", "active").execute(),
  ]);
  const avoid = fresh && state.saved ? state.saved.tracks.map((t) => t.topic) : [];

  try {
    const { data, source } = await runAiTask({
      user,
      purpose: "recommendations",
      tier: "smart",
      schema: recommendationsSchema,
      system: RECOMMEND_SYSTEM_PROMPT,
      prompt: recommendPrompt({ learner: learner ?? "", current: tracks.map((t) => t.title), avoid }),
      effort: "low",
      demo: () => demoRecommendations(avoid),
    });
    const saved: StoredRecommendations = { ...data, source };

    // Leaves updated_at alone, so the profile's own "last changed" time stays true.
    await db
      .updateTable("profiles")
      .set({ recommendations: JSON.stringify(saved), recommended_at: new Date() })
      .where("user_id", "=", user.id)
      .execute();
    return { saved, error: null };
  } catch (error) {
    if (error instanceof AiError) return { saved: state.saved, error: error.userMessage };
    throw error;
  }
}
