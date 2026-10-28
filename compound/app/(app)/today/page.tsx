import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { requireOnboardedUser } from "@/lib/auth/dal";
import { formatLongDate, todayIn } from "@/lib/dates/calendar";
import { getGoals } from "@/lib/goals/queries";
import { getTodayHabits } from "@/lib/habits/queries";
import { getTodayLessons } from "@/lib/lessons/queries";
import { getPrinciple } from "@/lib/principles/queries";
import { GoalSteps } from "./goal-steps";
import { HabitChecklist } from "./habit-checklist";
import { PrincipleCard } from "./principle-card";
import { TodayLessons } from "./today-lessons";

export const metadata: Metadata = { title: "Today" };

export default function TodayPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-8 md:py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Today</h1>

      <Suspense fallback={<TodaySkeleton />}>
        <TodayContent />
      </Suspense>
    </main>
  );
}

async function TodayContent() {
  const user = await requireOnboardedUser();
  // The date in the user's timezone decides which habits are due and which
  // check-ins count as today.
  const today = todayIn(user.timezone);
  const [{ habits, activeCount }, lessons, principle, goals] = await Promise.all([
    getTodayHabits(user.id, today),
    getTodayLessons(user.id, today),
    getPrinciple(user.id, today), // only reads; the card writes it once if missing
    getGoals(user.id, today),
  ]);
  // The next open step of each active goal.
  const goalSteps = goals.flatMap((g) =>
    g.status === "active" && g.nextStep
      ? [{ goalId: g.id, goalTitle: g.title, status: g.schedule.status, stepId: g.nextStep.id, stepTitle: g.nextStep.title }]
      : [],
  );

  return (
    <>
      <p className="mt-1 text-muted-foreground">{formatLongDate(today)}</p>

      <div className="mt-8 flex flex-col gap-6">
        {lessons.length > 0 && <TodayLessons lessons={lessons} />}
        {goalSteps.length > 0 && <GoalSteps steps={goalSteps} />}
        {habits.length > 0 ? (
          <HabitChecklist habits={habits} />
        ) : (
          <div className="rounded-2xl border border-dashed p-8 text-center">
            <p className="font-medium">
              {activeCount > 0 ? "No habits scheduled today." : "You don't have any habits yet."}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {activeCount > 0
                ? "Enjoy the rest day. Your streaks are safe."
                : "Habits you add will show up here."}
            </p>
            <Link href="/habits" className={buttonVariants({ variant: "outline", className: "mt-4" })}>
              {activeCount > 0 ? "Manage habits" : "Add a habit"}
            </Link>
          </div>
        )}
        <PrincipleCard initial={principle} />
      </div>
    </>
  );
}

function TodaySkeleton() {
  return (
    <div aria-hidden className="animate-pulse">
      <div className="mt-2 h-5 w-48 rounded bg-muted" />
      <div className="mt-8 h-48 rounded-2xl bg-muted" />
    </div>
  );
}
