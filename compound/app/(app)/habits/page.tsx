import { Suspense } from "react";
import { requireOnboardedUser } from "@/lib/auth/dal";
import { todayIn } from "@/lib/dates/calendar";
import { getHabitsOverview } from "@/lib/habits/queries";
import { HabitsManager } from "./habits-manager";

export default function HabitsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-8 md:py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Habits</h1>
      <p className="mt-1 text-muted-foreground">
        Small things you do on purpose. Streaks count only the days you schedule.
      </p>

      <div className="mt-8">
        <Suspense fallback={<div aria-hidden className="h-64 animate-pulse rounded-2xl bg-muted" />}>
          <HabitsContent />
        </Suspense>
      </div>
    </main>
  );
}

async function HabitsContent() {
  const user = await requireOnboardedUser();
  const { active, archived } = await getHabitsOverview(user.id, todayIn(user.timezone));
  return <HabitsManager active={active} archived={archived} />;
}
