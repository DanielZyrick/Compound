import "server-only";
import { db } from "@/lib/db";
import type { CalendarDate } from "@/lib/db/types";
import { principleSchema, type Principle } from "./principle";

export type TodayPrinciple = { principle: Principle; source: "ai" | "demo"; reflection: string | null };

/** The user's saved principle for a date, validated again, or null if there's none yet. */
export async function getPrinciple(userId: string, date: CalendarDate): Promise<TodayPrinciple | null> {
  const row = await db
    .selectFrom("daily_principles")
    .select(["content", "source", "reflection"])
    .where("user_id", "=", userId)
    .where("date", "=", date)
    .executeTakeFirst();
  if (!row) return null;

  const parsed = principleSchema.safeParse(row.content);
  if (!parsed.success) {
    console.error("[principles] stored principle failed validation:", parsed.error.message);
    return null;
  }
  return { principle: parsed.data, source: row.source, reflection: row.reflection };
}

/** Titles of the user's recent principles, so the AI doesn't repeat them. */
export async function recentPrincipleTitles(userId: string, limit = 14): Promise<string[]> {
  const rows = await db
    .selectFrom("daily_principles")
    .select("content")
    .where("user_id", "=", userId)
    .orderBy("date", "desc")
    .limit(limit)
    .execute();
  return rows.flatMap((r) => {
    const parsed = principleSchema.safeParse(r.content);
    return parsed.success ? [parsed.data.title] : [];
  });
}
