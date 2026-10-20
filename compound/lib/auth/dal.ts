import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

// Data access layer: the real authorization check. Every protected page and
// server action calls requireUser() before reading or changing data.
// cache() makes repeated calls in one request hit the database only once.
//
// These read the request, so with cacheComponents a component that calls
// them must be wrapped in <Suspense>.

/** The signed-in user's database row, or null if signed out. */
export const getCurrentUser = cache(async () => {
  // Mark this as request-time work. Without it, Next.js tries to prerender
  // auth() and fails on the random values Auth.js generates internally.
  await connection();

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  // Check the row still exists: a valid cookie can outlive a deleted user.
  const user = await db
    .selectFrom("users")
    .selectAll()
    .where("id", "=", userId)
    .executeTakeFirst();

  return user ?? null;
});

/** The signed-in user's database row. Redirects to /login if signed out. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Like requireUser(), but also sends users who haven't onboarded to /onboarding. */
export async function requireOnboardedUser() {
  const user = await requireUser();
  if (!user.onboarded_at) redirect("/onboarding");
  return user;
}
