"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { onboardingSchema } from "@/lib/validation/onboarding";

export type OnboardingState = { errors: string[] };

export async function completeOnboarding(
  _previous: OnboardingState,
  input: unknown, // comes from the browser, so it's untrusted until validated
): Promise<OnboardingState> {
  const user = await requireUser();
  if (user.onboarded_at) redirect("/today");

  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    // Show each problem once, in the order the form presents them.
    return { errors: [...new Set(parsed.error.issues.map((issue) => issue.message))] };
  }
  const { goals, habits, timezone } = parsed.data;

  // All or nothing: if any insert fails, none of it is saved.
  await db.transaction().execute(async (trx) => {
    // The `onboarded_at is null` condition makes a double submit harmless:
    // the second one updates no row and stops here.
    const updated = await trx
      .updateTable("users")
      .set({ timezone, onboarded_at: new Date() })
      .where("id", "=", user.id)
      .where("onboarded_at", "is", null)
      .returning("id")
      .executeTakeFirst();
    if (!updated) return;

    await trx
      .insertInto("focus_areas")
      .values(
        goals.map((g) => ({
          user_id: user.id,
          goal: g.goal,
          custom_label: g.goal === "custom" ? g.customLabel : null,
        })),
      )
      .execute();

    await trx
      .insertInto("habits")
      .values(habits.map((h) => ({ user_id: user.id, name: h.name, schedule: h.schedule })))
      .execute();
  });

  redirect("/today");
}
