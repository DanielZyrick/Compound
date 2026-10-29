import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, ArrowRight, Check, Lock } from "lucide-react";
import { z } from "zod";
import { buttonVariants } from "@/components/ui/button";
import { requireOnboardedUser } from "@/lib/auth/dal";
import { todayIn } from "@/lib/dates/calendar";
import { isDayOpen } from "@/lib/lessons/rules";
import { getTrack } from "@/lib/tracks/queries";
import { cn } from "@/lib/utils";
import { TrackBadges } from "../track-badges";

export const metadata: Metadata = { title: "Learning track" };

export default function TrackPage({ params }: PageProps<"/tracks/[id]">) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-8 md:py-10">
      <Link href="/tracks" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Tracks
      </Link>

      <Suspense fallback={<div aria-hidden className="mt-6 h-96 animate-pulse rounded-2xl bg-muted" />}>
        <TrackPlan params={params} />
      </Suspense>
    </main>
  );
}

async function TrackPlan({ params }: Pick<PageProps<"/tracks/[id]">, "params">) {
  const { id } = await params;
  // Anything that isn't a UUID can't be a track; don't send it to the database.
  if (!z.uuid().safeParse(id).success) notFound();

  const user = await requireOnboardedUser();
  const track = await getTrack(user.id, id, todayIn(user.timezone));
  if (!track) notFound();

  return (
    <>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">{track.title}</h1>
      <p className="mt-1 text-muted-foreground tabular-nums">
        {track.completedDays.size} of {track.total_days} done
        {track.habit_name && <> · Habit: {track.habit_name}</>}
      </p>
      <div
        role="progressbar"
        aria-label="Days done"
        aria-valuemin={0}
        aria-valuemax={track.total_days}
        aria-valuenow={track.completedDays.size}
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary"
      >
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${(track.completedDays.size / track.total_days) * 100}%` }}
        />
      </div>
      {track.nextDay && (
        <Link
          href={`/tracks/${track.id}/day/${track.nextDay}`}
          className={buttonVariants({ className: "mt-4" })}
        >
          {track.completedDays.size === 0 ? "Start day 1" : `Continue with day ${track.nextDay}`}
          <ArrowRight />
        </Link>
      )}
      <div className="mt-3">
        <TrackBadges type={track.type} level={track.level} planSource={track.plan_source} />
      </div>
      {track.plan_source === "demo" && (
        <p className="mt-4 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
          This is an example plan, made without AI because no API key is set. Tracks created after
          AI is connected get a plan written for your topic and goal.
        </p>
      )}

      <ol className="mt-8 flex flex-col gap-2">
        {track.days.map((day) => {
          const isNext = day.day_number === track.nextDay;
          const open = isDayOpen(day.day_number, track.calendarDay, track.completedDays);
          const done = day.completed_at !== null;
          const content = (
            <>
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-full text-sm font-medium tabular-nums",
                  done && "bg-success text-white",
                  !done && isNext && "bg-primary text-primary-foreground",
                  !done && !isNext && "bg-secondary text-muted-foreground",
                )}
              >
                {done ? <Check className="size-4" aria-label="Done" /> : open ? day.day_number : <Lock className="size-3.5" aria-label="Locked" />}
              </span>
              <span className="min-w-0">
                <span className="block font-medium">
                  {day.title}
                  {isNext && <span className="ml-2 text-xs font-normal text-primary">Up next</span>}
                </span>
                <span className="mt-0.5 block text-sm text-muted-foreground">{day.summary}</span>
              </span>
            </>
          );
          const className = cn(
            "flex gap-4 rounded-xl border p-4",
            isNext && "border-primary bg-primary/5",
            !open && "opacity-60",
          );
          return (
            <li key={day.day_number} aria-current={isNext ? "step" : undefined}>
              {open ? (
                <Link
                  href={`/tracks/${track.id}/day/${day.day_number}`}
                  className={cn(className, "outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50")}
                >
                  {content}
                </Link>
              ) : (
                <div className={className}>{content}</div>
              )}
            </li>
          );
        })}
      </ol>
    </>
  );
}
