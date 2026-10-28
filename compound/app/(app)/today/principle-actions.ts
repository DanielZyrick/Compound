"use server";

import { z } from "zod";
import { AiError } from "@/lib/ai/errors";
import { runAiTask } from "@/lib/ai/run";
import { requireOnboardedUser } from "@/lib/auth/dal";
import { todayIn } from "@/lib/dates/calendar";
import { db } from "@/lib/db";
import { GOAL_LABELS } from "@/lib/onboarding/goals";
import { demoPrinciple, PRINCIPLE_SYSTEM_PROMPT, principlePrompt, principleSchema } from "@/lib/principles/principle";
import { getPrinciple, recentPrincipleTitles, type TodayPrinciple } from "@/lib/principles/queries";

export type LoadPrincipleResult = { principle: TodayPrinciple | null; error: string | null };

/**
 * Today's principle for the user: from the database if it exists, otherwise
 * written once (fast model) and saved. Called by the Today card after the
 * page has loaded, so rendering or prefetching a page never spends an AI call.
 */
export async function loadPrinciple(): Promise<LoadPrincipleResult> {
  const user = await requireOnboardedUser();
  const today = todayIn(user.timezone);

  const existing = await getPrinciple(user.id, today);
  if (existing) return { principle: existing, error: null };

  const [focus, recent] = await Promise.all([
    db
      .selectFrom("focus_areas")
      .select(["goal", "custom_label", "description"])
      .where("user_id", "=", user.id)
      .orderBy("created_at", "desc")
      .executeTakeFirst(),
    recentPrincipleTitles(user.id),
  ]);
  const focusText = focus
    ? `${focus.custom_label ?? GOAL_LABELS[focus.goal]}${focus.description ? `: ${focus.description}` : ""}`
    : null;

  try {
    const { data, source } = await runAiTask({
      user,
      purpose: "principle",
      tier: "fast",
      schema: principleSchema,
      system: PRINCIPLE_SYSTEM_PROMPT,
      prompt: principlePrompt({ focus: focusText, recent }),
      effort: "low",
      demo: () => demoPrinciple(today),
    });

    // If another tab saved one first, keep that one.
    await db
      .insertInto("daily_principles")
      .values({ user_id: user.id, date: today, content: JSON.stringify(data), source })
      .onConflict((oc) => oc.columns(["user_id", "date"]).doNothing())
      .execute();
  } catch (error) {
    if (error instanceof AiError) return { principle: null, error: error.userMessage };
    throw error;
  }

  return { principle: await getPrinciple(user.id, today), error: null };
}

const reflectionSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, { error: "Write a few words first." })
    .max(2000, { error: "Keep your reflection under 2,000 characters." }),
});

/** Saves (or replaces) the user's reflection on today's principle. */
export async function saveReflection(input: unknown): Promise<{ errors: string[] }> {
  const user = await requireOnboardedUser();
  const parsed = reflectionSchema.safeParse(input);
  if (!parsed.success) return { errors: [...new Set(parsed.error.issues.map((i) => i.message))] };

  const result = await db
    .updateTable("daily_principles")
    .set({ reflection: parsed.data.text })
    .where("user_id", "=", user.id)
    .where("date", "=", todayIn(user.timezone))
    .executeTakeFirst();
  if (result.numUpdatedRows === BigInt(0)) {
    return { errors: ["Today's principle isn't ready yet. Refresh and try again."] };
  }
  return { errors: [] };
}
