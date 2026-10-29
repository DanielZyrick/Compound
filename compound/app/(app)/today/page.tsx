import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { requireOnboardedUser } from "@/lib/auth/dal";
import { formatLongDate, todayIn } from "@/lib/dates/calendar";
import { firstName, greetingFor, hourIn } from "@/lib/dates/greeting";
import { getGoals, stepsDoneSince } from "@/lib/goals/queries";
import { getHabitWeek, getTodayHabits } from "@/lib/habits/queries";
import { weekStart } from "@/lib/habits/week";
import { getTodayLessons } from "@/lib/lessons/queries";
import { spentOn } from "@/lib/money/queries";
import { getPrinciple } from "@/lib/principles/queries";
import { GoalsTable, type GoalRow } from "./goals-table";
import { HabitChecklist } from "./habit-checklist";
import { PrincipleCard } from "./principle-card";
import { StatsPill } from "./stats-pill";
import { TodayLessons } from "./today-lessons";

export const metadata: Metadata = { title: "Today" };

/** How many goals the Goals card lists before "See all". */
const GOALS_SHOWN = 5;

export default function TodayPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-8 md:py-10">
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
  const [{ habits, activeCount }, week, lessons, principle, goals, stepsThisWeek, spentToday] = await Promise.all([
    getTodayHabits(user.id, today),
    getHabitWeek(user, today),
    getTodayLessons(user, today),
    getPrinciple(user.id, today), // only reads; the card writes it once if missing
    getGoals(user.id, today),
    stepsDoneSince(user.id, weekStart(today)),
    spentOn(user.id, today),
  ]);

  const active = goals.filter((g) => g.status === "active");
  const goalRows: GoalRow[] = active.slice(0, GOALS_SHOWN).map((g) => ({
    goalId: g.id,
    title: g.title,
    status: g.schedule.status,
    progress: g.schedule.progress,
    daysLeft: g.schedule.daysLeft,
    step: g.nextStep ? { id: g.nextStep.id, title: g.nextStep.title } : null,
  }));
  const name = firstName(user.name);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{formatLongDate(today)}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            {greetingFor(hourIn(user.timezone))}
            {name ? `, ${name}` : ""}
          </h1>
        </div>
        <Link href="/money?add=expense#quick-add" className={buttonVariants({ variant: "outline" })}>
          <Plus />
          Expense
        </Link>
      </header>

      <div className="mt-6">
        <StatsPill
          streak={Math.max(0, ...habits.map((h) => h.streak))}
          habitsDone={habits.filter((h) => h.doneToday).length}
          habitsDue={habits.length}
          stepsThisWeek={stepsThisWeek}
          spentCents={spentToday}
          currency={user.currency}
        />
      </div>

      <div className="mt-6 flex flex-col gap-6">
        <GoalsTable rows={goalRows} total={active.length} />

        <div className="grid items-start gap-6 lg:grid-cols-2">
          {habits.length > 0 ? (
            <HabitChecklist habits={habits} week={week} today={today} />
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

          <div className="flex flex-col gap-6">
            <TodayLessons lessons={lessons} />
            <PrincipleCard initial={principle} />
          </div>
        </div>
      </div>
    </>
  );
}

function TodaySkeleton() {
  return (
    <div aria-hidden className="animate-pulse">
      <div className="h-4 w-40 rounded bg-muted" />
      <div className="mt-2 h-8 w-64 rounded bg-muted" />
      <div className="mt-6 h-11 rounded-2xl bg-muted lg:w-2/3 lg:rounded-full" />
      <div className="mt-6 h-48 rounded-2xl bg-muted" />
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="h-72 rounded-2xl bg-muted" />
        <div className="h-72 rounded-2xl bg-muted" />
      </div>
    </div>
  );
}
