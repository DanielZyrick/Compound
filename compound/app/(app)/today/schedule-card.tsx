import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { describeStartsIn, groupByDay, nextEvent } from "@/lib/calendar/events";
import { getSchedule } from "@/lib/calendar/queries";
import type { CalendarDate } from "@/lib/db/types";
import { DayEvents } from "../schedule/event-list";

/**
 * Today's events from Google Calendar. Shown only once the user has
 * connected it; streams in on its own, so a slow Google never holds up Today.
 */
export async function ScheduleCard({ user, today }: { user: { id: string; timezone: string }; today: CalendarDate }) {
  const result = await getSchedule(user, today, 1);
  if (result.status === "not-connected") return null;

  return (
    <section aria-labelledby="today-schedule" className="rounded-2xl border p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <h2 id="today-schedule" className="flex items-center gap-2 font-semibold">
          <CalendarDays className="size-4 text-primary" aria-hidden />
          Schedule
        </h2>
        <Link
          href="/schedule"
          className="rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          This week
        </Link>
      </div>
      <div className="mt-3">
        <ScheduleBody result={result} user={user} today={today} />
      </div>
    </section>
  );
}

function ScheduleBody({
  result,
  user,
  today,
}: {
  result: Exclude<Awaited<ReturnType<typeof getSchedule>>, { status: "not-connected" }>;
  user: { timezone: string };
  today: CalendarDate;
}) {
  if (result.status === "revoked") return <Reconnect />;
  if (result.status === "unavailable") {
    return <p className="text-sm text-muted-foreground">Google Calendar isn&apos;t answering right now. Try again later.</p>;
  }

  const [day] = groupByDay(result.events, today, 1, user.timezone);
  if (day.allDay.length === 0 && day.timed.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing on your calendar today.</p>;
  }
  const next = nextEvent(day.timed, new Date());
  const highlight = next ? { id: next.event.id, label: next.minutes === 0 ? "Now" : `Next · ${describeStartsIn(next.minutes)}` } : undefined;
  return <DayEvents day={day} timezone={user.timezone} highlight={highlight} />;
}

/** Google stopped accepting the connection (access removed in their Google account). */
export function Reconnect() {
  return (
    <p className="text-sm">
      <span className="text-destructive">Compound can&apos;t reach your calendar anymore.</span>{" "}
      <a href="/api/calendar/connect" className="font-medium text-primary hover:underline">
        Reconnect Google Calendar
      </a>
    </p>
  );
}
