import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { requireOnboardedUser } from "@/lib/auth/dal";
import { groupByDay } from "@/lib/calendar/events";
import { getSchedule } from "@/lib/calendar/queries";
import { blocksForDay, hourRange, layoutDay, mondayOf, weekLabel } from "@/lib/calendar/week";
import { addDays, todayIn } from "@/lib/dates/calendar";
import { cn } from "@/lib/utils";
import { Reconnect } from "../today/schedule-card";
import { WeekCalendar, type WeekDay } from "./week-calendar";

export const metadata: Metadata = { title: "Schedule" };

export default function SchedulePage({ searchParams }: PageProps<"/schedule">) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8 md:py-10">
      <Suspense fallback={<div aria-hidden className="h-[32rem] animate-pulse rounded-2xl bg-muted" />}>
        <Week searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

/** ?week=YYYY-MM-DD shows the week containing that date; anything else shows this week. */
function weekFrom(param: unknown, today: string): string {
  const valid = typeof param === "string" && /^\d{4}-\d{2}-\d{2}$/.test(param) && !Number.isNaN(Date.parse(param));
  return mondayOf(valid ? param : today);
}

async function Week({ searchParams }: Pick<PageProps<"/schedule">, "searchParams">) {
  const user = await requireOnboardedUser();
  const today = todayIn(user.timezone);
  const monday = weekFrom((await searchParams).week, today);
  const thisWeek = monday === mondayOf(today);
  const result = await getSchedule(user, monday, 7);

  const header = (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Schedule</h1>
        <p className="mt-1 text-sm text-muted-foreground">From your Google Calendar, read-only.</p>
      </div>
      {result.status !== "not-connected" && (
        <nav aria-label="Week" className="flex items-center gap-2">
          <Link
            href="/schedule"
            aria-disabled={thisWeek}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), thisWeek && "pointer-events-none opacity-50")}
          >
            Today
          </Link>
          <Link
            href={`/schedule?week=${addDays(monday, -7)}`}
            aria-label="Previous week"
            className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
          >
            <ChevronLeft />
          </Link>
          <span className="min-w-36 text-center text-sm font-medium tabular-nums">{weekLabel(monday)}</span>
          <Link
            href={`/schedule?week=${addDays(monday, 7)}`}
            aria-label="Next week"
            className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
          >
            <ChevronRight />
          </Link>
        </nav>
      )}
    </header>
  );

  if (result.status === "not-connected") {
    return (
      <>
        {header}
        <div className="mt-8 rounded-2xl border border-dashed p-8 text-center">
          <p className="font-medium">See your week here.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect Google Calendar to see your events next to your habits and goals. Compound can only read it.
          </p>
          <a href="/api/calendar/connect" className={buttonVariants({ variant: "outline", className: "mt-4" })}>
            <CalendarDays />
            Connect Google Calendar
          </a>
        </div>
      </>
    );
  }
  if (result.status !== "ok") {
    return (
      <>
        {header}
        <div className="mt-8">
          {result.status === "revoked" ? (
            <Reconnect />
          ) : (
            <p className="text-muted-foreground">Google Calendar isn&apos;t answering right now. Try again later.</p>
          )}
        </div>
      </>
    );
  }

  const grouped = groupByDay(result.events, monday, 7, user.timezone);
  const days: WeekDay[] = grouped.map((day) => ({
    date: day.date,
    allDay: day.allDay.map(({ id, title }) => ({ id, title })),
    blocks: layoutDay(blocksForDay(result.events, day.date, user.timezone)),
  }));
  const hours = hourRange(days.flatMap((d) => d.blocks));

  return (
    <>
      {header}
      <div className="mt-6">
        <WeekCalendar days={days} hours={hours} today={today} timezone={user.timezone} />
      </div>
    </>
  );
}
