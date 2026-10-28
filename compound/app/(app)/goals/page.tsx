import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { requireOnboardedUser } from "@/lib/auth/dal";
import { formatShortDate, todayIn } from "@/lib/dates/calendar";
import { getGoals } from "@/lib/goals/queries";
import { daysLeftLabel, GoalStatusBadge } from "./goal-status";

export const metadata: Metadata = { title: "Goals" };

export default function GoalsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-8 md:py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Goals</h1>
          <p className="mt-1 text-muted-foreground">Clear finish lines, reached one step at a time.</p>
        </div>
        <Link href="/goals/new" className={buttonVariants()}>
          <Plus />
          New goal
        </Link>
      </div>

      <div className="mt-8">
        <Suspense fallback={<div aria-hidden className="h-48 animate-pulse rounded-2xl bg-muted" />}>
          <GoalList />
        </Suspense>
      </div>
    </main>
  );
}

async function GoalList() {
  const user = await requireOnboardedUser();
  const today = todayIn(user.timezone);
  const goals = await getGoals(user.id, today);

  if (goals.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed p-8 text-center">
        <p className="font-medium">No goals yet.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick something you want to finish, and get a plan with built-in buffer time.
        </p>
        <Link href="/goals/new" className={buttonVariants({ variant: "outline", className: "mt-4" })}>
          Set your first goal
        </Link>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {goals.map((goal) => {
        const { schedule } = goal;
        const percent = Math.round(schedule.progress * 100);
        return (
          <li key={goal.id} className="rounded-xl border p-4">
            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
              <p className="line-clamp-2 font-medium break-words">{goal.title}</p>
              <GoalStatusBadge status={schedule.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Due {formatShortDate(goal.deadline, today.slice(0, 4))}
              {schedule.status !== "completed" && <> · {daysLeftLabel(schedule.daysLeft)}</>}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div
                role="progressbar"
                aria-label={`${goal.title}: progress`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary"
              >
                <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
              </div>
              <span className="text-sm tabular-nums">{percent}%</span>
            </div>
            {goal.nextStep && (
              <p className="mt-3 text-sm">
                <span className="text-muted-foreground">Next step: </span>
                {goal.nextStep.title}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
