import "server-only";
import { db } from "@/lib/db";
import { isProfileEmpty } from "@/lib/profile/context";
import { needsRecommendations, storedRecommendationsSchema, type StoredRecommendations } from "./recommend";

export type RecommendationsState =
  | { status: "no-profile" } // nothing to base suggestions on yet
  | { status: "ready"; saved: StoredRecommendations }
  | { status: "stale"; saved: StoredRecommendations | null }; // the card asks for new ones

/** The user's saved suggestions and whether they still match their profile. Never calls the AI. */
export async function getRecommendations(userId: string): Promise<RecommendationsState> {
  const profile = await db
    .selectFrom("profiles")
    .select(["role", "improve", "skills", "interests", "daily_minutes", "recommendations", "recommended_at", "updated_at"])
    .where("user_id", "=", userId)
    .executeTakeFirst();
  if (!profile || isProfileEmpty(profile)) return { status: "no-profile" };

  const parsed = storedRecommendationsSchema.safeParse(profile.recommendations);
  if (profile.recommendations !== null && !parsed.success) {
    console.error("[recommendations] stored suggestions failed validation:", parsed.error.message);
  }
  const saved = parsed.success ? parsed.data : null;
  return saved && !needsRecommendations(profile) ? { status: "ready", saved } : { status: "stale", saved };
}
