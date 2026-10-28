"use server";

import { refresh } from "next/cache";
import { requireOnboardedUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { displayNameSchema, timezoneSettingSchema } from "@/lib/validation/settings";

export type SettingsResult = { errors: string[] };

function messages(issues: { message: string }[]) {
  return [...new Set(issues.map((i) => i.message))];
}

/** Changes the name shown in the app. GitHub sign-in keeps it (only the avatar refreshes). */
export async function updateDisplayName(input: unknown): Promise<SettingsResult> {
  const user = await requireOnboardedUser();
  const parsed = displayNameSchema.safeParse(input);
  if (!parsed.success) return { errors: messages(parsed.error.issues) };

  await db.updateTable("users").set({ name: parsed.data.name }).where("id", "=", user.id).execute();
  refresh();
  return { errors: [] };
}

/**
 * Changes the user's timezone, which decides when their day starts. Saved
 * check-ins keep their dates; only "today" moves.
 */
export async function updateTimezone(input: unknown): Promise<SettingsResult> {
  const user = await requireOnboardedUser();
  const parsed = timezoneSettingSchema.safeParse(input);
  if (!parsed.success) return { errors: messages(parsed.error.issues) };

  await db.updateTable("users").set({ timezone: parsed.data.timezone }).where("id", "=", user.id).execute();
  refresh();
  return { errors: [] };
}
