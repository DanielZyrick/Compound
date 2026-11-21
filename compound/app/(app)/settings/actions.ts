"use server";

import { refresh } from "next/cache";
import { signOut } from "@/auth";
import { deleteAccount } from "@/lib/account/queries";
import { requireOnboardedUser } from "@/lib/auth/dal";
import { disconnect } from "@/lib/calendar/google";
import { db } from "@/lib/db";
import {
  currencySettingSchema,
  deleteAccountSchema,
  displayNameSchema,
  timezoneSettingSchema,
} from "@/lib/validation/settings";

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

/**
 * Changes the currency amounts are shown in. Amounts aren't converted: it's
 * the currency the user records in, chosen once.
 */
export async function updateCurrency(input: unknown): Promise<SettingsResult> {
  const user = await requireOnboardedUser();
  const parsed = currencySettingSchema.safeParse(input);
  if (!parsed.success) return { errors: messages(parsed.error.issues) };

  await db.updateTable("users").set({ currency: parsed.data.currency }).where("id", "=", user.id).execute();
  refresh();
  return { errors: [] };
}

/** Disconnects Google Calendar: revokes access at Google and deletes the stored tokens. */
export async function disconnectCalendar(): Promise<SettingsResult> {
  const user = await requireOnboardedUser();
  await disconnect(user);
  refresh();
  return { errors: [] };
}

/**
 * "Delete my account": after the user types "delete", revokes Google Calendar
 * access, deletes the account and everything in it, and signs them out to
 * /login, which says it's done. Demo accounts leave from the demo banner instead.
 */
export async function deleteMyAccount(_previous: SettingsResult, formData: FormData): Promise<SettingsResult> {
  const user = await requireOnboardedUser();
  if (user.is_demo) return { errors: ["This is a demo account. Use “Sign in to start your own” to leave it."] };
  const parsed = deleteAccountSchema.safeParse({ confirm: formData.get("confirm") ?? "" });
  if (!parsed.success) return { errors: messages(parsed.error.issues) };

  await deleteAccount(user);
  await signOut({ redirectTo: "/login?deleted=1" });
  return { errors: [] };
}
