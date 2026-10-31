import "server-only";
import { db } from "@/lib/db";
import { learnerContext, type ContextProfile } from "./context";

/** The user's "About you" answers, or null if they haven't filled it in. */
export async function getProfile(userId: string): Promise<ContextProfile | null> {
  const profile = await db
    .selectFrom("profiles")
    .select(["role", "improve", "skills", "interests", "daily_minutes"])
    .where("user_id", "=", userId)
    .executeTakeFirst();
  return profile ?? null;
}

/** What the AI is told about the user: focus areas plus profile, as plain lines. */
export async function getLearnerContext(userId: string): Promise<string | null> {
  const [focusAreas, profile] = await Promise.all([
    db
      .selectFrom("focus_areas")
      .select(["goal", "custom_label", "description"])
      .where("user_id", "=", userId)
      .orderBy("created_at")
      .execute(),
    getProfile(userId),
  ]);
  return learnerContext(focusAreas, profile);
}
