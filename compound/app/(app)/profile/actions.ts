"use server";

import { refresh } from "next/cache";
import { requireOnboardedUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { profileSchema } from "@/lib/validation/profile";

export type ProfileResult = { errors: string[] };

/** Saves the "About you" answers (creating the row the first time). */
export async function saveProfile(input: unknown): Promise<ProfileResult> {
  const user = await requireOnboardedUser();

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { errors: [...new Set(parsed.error.issues.map((i) => i.message))] };
  const { role, improve, skills, interests, dailyMinutes } = parsed.data;

  const answers = { role, improve, skills, interests, daily_minutes: dailyMinutes, updated_at: new Date() };
  await db
    .insertInto("profiles")
    .values({ user_id: user.id, ...answers })
    .onConflict((oc) => oc.column("user_id").doUpdateSet(answers))
    .execute();

  refresh();
  return { errors: [] };
}
