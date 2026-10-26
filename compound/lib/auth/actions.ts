"use server";

import { signOut } from "@/auth";

// A server action, so client components (like the user menu) can sign out.
export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
