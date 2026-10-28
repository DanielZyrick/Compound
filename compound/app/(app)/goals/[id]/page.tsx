import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Check, Compass } from "lucide-react";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { requireOnboardedUser } from "@/lib/auth/dal";
import { formatShortDate, todayIn } from "@/lib/dates/calendar";
import type { Guide } from "@/lib/goals/plan";
import { getGoal, type GoalWithSchedule } from "@/lib/goals/queries";
import { cn } from "@/lib/utils";
import { daysLeftLabel, GoalStatusBadge } from "../goal-status";
import { ArchiveGoal, ExtendDeadline } from "./goal-controls";
import { SavingsCard } from "./savings-card";
import { StepList } from "./step-list";

export const metadata: Metadata = { title: "Goal" };

export default function GoalPage({ params }: PageProps<"/goals/[id]">) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-8 md:py-10">
      <Link href="/goals" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Goals
      </Link>
      <Suspense fallback={<div aria-hidden className="mt-6 h-96 animate-pulse rounded-2xl bg-muted" />}>
        <GoalDetail params={params} />
      </Suspense>
    </main>
  );
}

async function GoalDetail({ params }: Pick<PageProps<"/goals/[id]">, "params">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const user = await requireOnboardedUser();
  const today = todayIn(user.timezone);
  const goal = await getGoal(user.id, id, today);
  if (!goal) notFound();

  const { schedule } = goal;
  const year = today.slice(0, 4);
  const percent = Math.round(schedule.progress * 100);
  const editable = goal.status !== "archived";

  return (
    <div className="mt-4 flex flex-col gap-8">
      <header>
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <h1 className="text-2xl font-semibold tracking-tight break-words">{goal.title}</h1>
          <GoalStatusBadge status={schedule.status} className="mt-1" />
        </div>
        <p className="mt-2 text-muted-foreground">{goal.why}</p>
        <p className="mt-3 text-sm">
          Due {formatShortDate(goal.deadline, year)}
          {schedule.status !== "completed" && (
            <span className="text-muted-foreground"> · {daysLeftLabel(schedule.daysLeft)}</span>
          )}
        </p>
        <div className="mt-3 flex items-center gap-3">
          <div
            role="progressbar"
            aria-label="Goal progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="h-2 flex-1 overflow-hidden rounded-full bg-secondary"
          >
            <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
          </div>
          <span className="text-sm font-medium tabular-nums">{percent}%</span>
        </div>
      </header>

      <StatusBanner goal={goal} year={year} />

      {editable && (
        <SavingsCard
          goalId={goal.id}
          targetCents={goal.targetCents}
          savedCents={goal.savedCents}
          currency={user.currency}
        />
      )}

      <section>
        <h2 className="text-lg font-semibold">Plan</h2>
        <ol className="mt-4 flex flex-col gap-4">
          {goal.milestones.map((milestone, index) => {
            const s = schedule.milestones[index];
            const done = milestone.steps.filter((step) => step.doneOn !== null).length;
            const moved = s.adjustedDue !== null && s.adjustedDue !== s.plannedDue;
            return (
              <li key={milestone.id} className={cn("rounded-xl border p-4", s.done && "bg-muted/40")}>
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "grid size-7 shrink-0 place-items-center rounded-full text-sm font-medium",
                      s.done ? "bg-success text-white" : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {s.done ? <Check className="size-4" aria-label="Done" /> : milestone.position}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <h3 className="font-medium break-words">{milestone.title}</h3>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {done} of {milestone.steps.length} steps
                      </p>
                    </div>
                    <p className="mt-0.5 text-sm">
                      {s.done ? (
                        <span className="text-success">Done</span>
                      ) : moved ? (
                        <>
                          <span className="text-muted-foreground line-through">
                            {formatShortDate(s.plannedDue, year)}
                          </span>{" "}
                          → now due {formatShortDate(s.adjustedDue!, year)}
                        </>
                      ) : (
                        <span className="text-muted-foreground">Due {formatShortDate(s.plannedDue, year)}</span>
                      )}
                    </p>
                    {milestone.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{milestone.description}</p>
                    )}
                  </div>
                </div>
                <div className="mt-3 sm:pl-10">
                  <StepList milestoneId={milestone.id} steps={milestone.steps} editable={editable} />
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {goal.guide && <GuideSection guide={goal.guide} demo={goal.planSource === "demo"} />}

      {editable && (
        <div className="border-t pt-4">
          <ArchiveGoal goalId={goal.id} />
        </div>
      )}
    </div>
  );
}

/** Explains the status in plain words, with the fix when the goal is at risk. */
function StatusBanner({ goal, year }: { goal: GoalWithSchedule; year: string }) {
  const { schedule } = goal;
  const end = schedule.projectedEnd ? formatShortDate(schedule.projectedEnd, year) : "";
  const bufferLeft = schedule.bufferDays - schedule.bufferUsed;

  const content = {
    completed: { tone: "border-success/30 bg-success/10", text: <>Every step is done. Well done!</> },
    on_track: {
      tone: "border-primary/20 bg-primary/5",
      text: (
        <>
          At your planned pace you&apos;ll finish by <strong>{end}</strong>
          {schedule.bufferDays > 0 && (
            <>, with {schedule.bufferDays} buffer {schedule.bufferDays === 1 ? "day" : "days"} to spare</>
          )}
          .
        </>
      ),
    },
    behind: {
      tone: "border-chart-3/40 bg-chart-3/10",
      text: (
        <>
          You&apos;re a little behind, so the remaining dates have moved to fit. At your planned pace
          you&apos;ll finish by <strong>{end}</strong>, using {schedule.bufferUsed} of {schedule.bufferDays} buffer
          days ({bufferLeft} left).
        </>
      ),
    },
    at_risk: {
      tone: "border-destructive/30 bg-destructive/5",
      text: (
        <>
          At your planned pace you&apos;d finish on <strong>{end}</strong>, after the deadline. Extend the deadline,
          or remove steps you don&apos;t really need.
        </>
      ),
    },
  }[schedule.status];

  return (
    <div role="status" className={cn("rounded-xl border p-4 text-sm", content.tone)}>
      <p>{content.text}</p>
      {schedule.status === "at_risk" && <ExtendDeadline goalId={goal.id} deadline={goal.deadline} />}
    </div>
  );
}

function GuideSection({ guide, demo }: { guide: Guide; demo: boolean }) {
  return (
    <section className="rounded-xl border p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Compass className="size-5 text-primary" aria-hidden />
          Execution guide
        </h2>
        {demo && <Badge variant="outline">Example</Badge>}
      </div>
      <p className="mt-3 leading-relaxed">{guide.approach}</p>

      <h3 className="mt-5 font-medium">Your first steps</h3>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
        {guide.firstSteps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>

      <h3 className="mt-5 font-medium">Watch out for</h3>
      <ul className="mt-2 space-y-2 text-sm">
        {guide.pitfalls.map((p) => (
          <li key={p.pitfall}>
            <span className="font-medium">{p.pitfall}.</span>{" "}
            <span className="text-muted-foreground">{p.avoid}</span>
          </li>
        ))}
      </ul>

      <h3 className="mt-5 font-medium">Stay on track</h3>
      <p className="mt-2 text-sm text-muted-foreground">{guide.stayOnTrack}</p>
    </section>
  );
}
