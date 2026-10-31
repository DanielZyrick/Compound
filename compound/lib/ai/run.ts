import "server-only";
import type { z } from "zod";
import { todayIn } from "@/lib/dates/calendar";
import { db } from "@/lib/db";
import { DAILY_AI_LIMIT, getClient, isDemoMode, modelFor, type ModelTier } from "./config";
import { AiError } from "./errors";
import { generateJson } from "./generate";

type RunOptions<Schema extends z.ZodType> = {
  user: { id: string; timezone: string };
  /** What the call is for, e.g. "track_plan". Stored in the log. */
  purpose: string;
  tier: ModelTier;
  schema: Schema;
  system: string;
  prompt: string;
  /** A PDF for the model to read, base64-encoded. */
  pdf?: string;
  effort?: "low" | "medium" | "high";
  /** Example output for demo mode (no API key). Checked against the schema too. */
  demo: () => z.input<Schema>;
};

export type AiResult<T> = { data: T; source: "ai" | "demo" };

/** How many AI calls the user has made today, in their timezone. */
export async function aiCallsToday(userId: string, timezone: string) {
  const row = await db
    .selectFrom("ai_calls")
    .select((eb) => eb.fn.countAll<string>().as("count"))
    .where("user_id", "=", userId)
    .where("day", "=", todayIn(timezone))
    .executeTakeFirstOrThrow();
  return Number(row.count);
}

/**
 * Runs one AI task for a user: checks their daily limit, calls the model
 * (with one retry on invalid output), and logs every attempt. Throws AiError.
 * In demo mode it returns the task's example output instead, without a call.
 */
export async function runAiTask<Schema extends z.ZodType>(
  options: RunOptions<Schema>,
): Promise<AiResult<z.infer<Schema>>> {
  const { user, purpose, tier, demo, ...request } = options;

  if (isDemoMode()) {
    return { data: request.schema.parse(demo()), source: "demo" };
  }

  if ((await aiCallsToday(user.id, user.timezone)) >= DAILY_AI_LIMIT) {
    throw new AiError("limit_reached");
  }

  const messages = getClient().beta.messages;
  const day = todayIn(user.timezone);

  try {
    const data = await generateJson(messages, {
      ...request,
      model: modelFor(tier),
      onAttempt: (attempt) =>
        db
          .insertInto("ai_calls")
          .values({
            user_id: user.id,
            day,
            purpose,
            model: attempt.model,
            ok: attempt.ok,
            input_tokens: attempt.inputTokens,
            output_tokens: attempt.outputTokens,
          })
          .execute()
          .then(() => undefined),
    });
    return { data, source: "ai" };
  } catch (error) {
    // The details stay in the server log; callers show error.userMessage.
    console.error(`[ai] ${purpose} failed:`, error);
    throw error;
  }
}
