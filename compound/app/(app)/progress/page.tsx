import Link from "next/link";
import { Suspense } from "react";
import { Flame, Trophy } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { requireOnboardedUser } from "@/lib/auth/dal";
import { describeSchedule } from "@/lib/dates/schedule";
import { getProgress, type Progress } from "@/lib/progress/queries";
import { CheckinGrid, GridLegend } from "./checkin-grid";

export default function ProgressPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-8 md:py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Progress</h1>
      <p className="mt-1 text-muted-foreground">Small steps, added up.</p>

      <Suspense fallback={<div aria-hidden className="mt-8 h-96 animate-pulse rounded-2xl bg-muted" />}>
        <ProgressContent />
      </Suspense>
    </main>
  );
}

async function ProgressContent() {
  const user = await requireOnboardedUser();
  const { habits, tracks, stats } = await getProgress(user);

  return (
    <div className="mt-8 flex flex-col gap-10">
      <StatTiles stats={stats} />

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">Habits</h2>
          <span className="text-sm text-muted-foreground">Last 30 days</span>
        </div>
        {habits.length === 0 ? (
          <EmptyState text="No active habits yet." href="/habits" action="Add a habit" />
        ) : (
          <>
            <div className="mt-3">
              <GridLegend />
            </div>
            <ul className="mt-4 flex flex-col gap-3">
              {habits.map((habit) => (
                <li key={habit.id} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{habit.name}</p>
                      <p className="text-xs text-muted-foreground">{describeSchedule(habit.schedule)}</p>
                    </div>
                    <div className="flex shrink-0 gap-4 text-sm tabular-nums">
                      <span className="flex items-center gap-1" title="Current streak">
                        <Flame className="size-4 fill-orange-400 text-orange-500" aria-hidden />
                        {habit.current} <span className="text-muted-foreground">now</span>
                      </span>
                      <span className="flex items-center gap-1" title="Best streak">
                        <Trophy className="size-4 text-chart-3" aria-hidden />
                        {habit.best} <span className="text-muted-foreground">best</span>
                      </span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <CheckinGrid grid={habit.grid} name={habit.name} />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Learning</h2>
        {tracks.length === 0 ? (
          <EmptyState text="No learning tracks yet." href="/tracks/new" action="Start a track" />
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {tracks.map((track) => (
              <li key={track.id}>
                <Link
                  href={`/tracks/${track.id}`}
                  className="block rounded-xl border p-4 outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{track.title}</p>
                    <p className="shrink-0 text-sm tabular-nums text-muted-foreground">
                      {track.status === "completed" ? "Completed" : `${track.doneDays} of ${track.total_days} days`}
                    </p>
                  </div>
                  <Bar value={track.doneDays} max={track.total_days} label={`${track.title}: days done`} />
                </Link>
              </li>
            ))}
          </ul>
        )}

        {stats.multipleChoice.total > 0 && (
          <div className="mt-4 rounded-xl border p-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-medium">Multiple-choice accuracy</p>
              <p className="text-sm tabular-nums">
                {stats.multipleChoice.correct} of {stats.multipleChoice.total} correct (
                {Math.round((stats.multipleChoice.correct / stats.multipleChoice.total) * 100)}%)
              </p>
            </div>
            <Bar value={stats.multipleChoice.correct} max={stats.multipleChoice.total} label="Correct answers" />
            {stats.openReviews > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Plus {stats.openReviews} written {stats.openReviews === 1 ? "answer" : "answers"} reviewed by AI.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

/** The headline numbers. Each is a single figure, so no chart is needed. */
function StatTiles({ stats }: { stats: Progress["stats"] }) {
  const tiles = [
    { label: "Check-ins", value: stats.checkins30, note: "last 30 days" },
    {
      label: "Longest streak now",
      value: stats.longestCurrent?.days ?? 0,
      note: stats.longestCurrent?.habit ?? "check in today to start one",
    },
    {
      label: "Lessons and readings",
      value: stats.lessonsDone + stats.readingsDone,
      note: `${stats.lessonsDone} lessons · ${stats.readingsDone} readings`,
    },
    { label: "Reflections", value: stats.reflections, note: "written so far" },
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map((tile) => (
        <div key={tile.label} className="rounded-xl border p-4">
          <dt className="text-xs text-muted-foreground">{tile.label}</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{tile.value}</dd>
          <dd className="mt-0.5 truncate text-xs text-muted-foreground">{tile.note}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A thin progress bar on a quiet track. The number beside it carries the value. */
function Bar({ value, max, label }: { value: number; max: number; label: string }) {
  const percent = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary"
    >
      <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
    </div>
  );
}

function EmptyState({ text, href, action }: { text: string; href: string; action: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-dashed p-6 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
      <Link href={href} className={buttonVariants({ variant: "outline", className: "mt-3" })}>
        {action}
      </Link>
    </div>
  );
}
