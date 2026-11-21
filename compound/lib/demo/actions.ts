"use server";

import { signIn, signOut } from "@/auth";
import { deleteUserData } from "@/lib/account/queries";
import { getCurrentUser } from "@/lib/auth/dal";

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
  if (user?.is_demo) await deleteUserData(user.id);
  await signOut({ redirectTo: "/login" });
}
