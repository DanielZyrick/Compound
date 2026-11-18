"use server";

import { signIn, signOut } from "@/auth";
import { getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";

/** "Try the demo": signs in as a brand-new demo account (see the demo provider in auth.ts). */
export async function startDemo(formData: FormData) {
  const timezone = formData.get("timezone");
  await signIn("demo", { timezone: typeof timezone === "string" ? timezone : "", redirectTo: "/today" });
}

/**
 * Leaves the demo for the real sign-in page. The demo account is deleted
 * right away instead of waiting a day. Only ever deletes a demo account.
 */
export async function leaveDemo() {
  const user = await getCurrentUser();
  if (user?.is_demo) {
    await db.deleteFrom("users").where("id", "=", user.id).where("is_demo", "=", true).execute();
  }
  await signOut({ redirectTo: "/login" });
}
