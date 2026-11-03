import type { Metadata } from "next";
import { Suspense } from "react";
import { CalendarDays } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { requireOnboardedUser } from "@/lib/auth/dal";
import { describeStartsIn, groupByDay, nextEvent } from "@/lib/calendar/events";
import { getSchedule } from "@/lib/calendar/queries";
import { formatLongDate, todayIn } from "@/lib/dates/calendar";
import { Reconnect } from "../today/schedule-card";
import { DayEvents } from "./event-list";

export const metadata: Metadata = { title: "Schedule" };

const DAYS = 7;

export default function SchedulePage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-8 md:py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Schedule</h1>
      <p className="mt-1 text-muted-foreground">The next 7 days from your Google Calendar.</p>

      <div className="mt-8">
        <Suspense fallback={<div aria-hidden className="h-96 animate-pulse rounded-2xl bg-muted" />}>
          <Week />
        </Suspense>
      </div>
    </main>
  );
}

async function Week() {
  const user = await requireOnboardedUser();
  const today = todayIn(user.timezone);
  const result = await getSchedule(user, today, DAYS);

  if (result.status === "not-connected") {
    return (
      <div className="rounded-2xl border border-dashed p-8 text-center">
        <p className="font-medium">See your week here.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect Google Calendar to see your events next to your habits and goals. Compound can only read it.
        </p>
        <a href="/api/calendar/connect" className={buttonVariants({ variant: "outline", className: "mt-4" })}>
          <CalendarDays />
          Connect Google Calendar
        </a>
      </div>
    );
  }
  if (result.status === "revoked") return <Reconnect />;
  if (result.status === "unavailable") {
    return <p className="text-muted-foreground">Google Calendar isn&apos;t answering right now. Try again later.</p>;
  }

  const days = groupByDay(result.events, today, DAYS, user.timezone);
  const next = nextEvent(days[0].timed, new Date());

  return (
    <ol className="flex flex-col gap-6">
      {days.map((day, i) => {
        const empty = day.allDay.length === 0 && day.timed.length === 0;
        return (
          <li key={day.date} aria-labelledby={`day-${day.date}`}>
            <h2 id={`day-${day.date}`} className="text-sm font-semibold">
              {i === 0 ? "Today" : i === 1 ? "Tomorrow" : formatLongDate(day.date).split(",")[0]}
              <span className="ml-2 font-normal text-muted-foreground">{formatLongDate(day.date).split(", ")[1]}</span>
            </h2>
            <div className="mt-2">
              {empty ? (
                <p className="text-sm text-muted-foreground">Nothing planned.</p>
              ) : (
                <DayEvents
                  day={day}
                  timezone={user.timezone}
                  highlight={
                    i === 0 && next
                      ? { id: next.event.id, label: next.minutes === 0 ? "Now" : `Next · ${describeStartsIn(next.minutes)}` }
                      : undefined
                  }
                />
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
