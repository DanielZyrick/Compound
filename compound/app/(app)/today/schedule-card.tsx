import Link from "next/link";
import { CalendarDays, Coffee } from "lucide-react";
import { describeStartsIn, groupByDay, nextEvent } from "@/lib/calendar/events";
import { biggestFreeGap, clockLabel, minutesNowIn } from "@/lib/calendar/free";
import { getSchedule } from "@/lib/calendar/queries";
import { blocksForDay, formatMinutes } from "@/lib/calendar/week";
import type { CalendarDate } from "@/lib/db/types";
import { DayEvents } from "../schedule/event-list";

/** Today's first lesson that isn't done yet, to suggest for a free block. */
type NextLesson = { href: string } | null;

/**
 * Today's events from Google Calendar. Shown only once the user has
 * connected it; streams in on its own, so a slow Google never holds up Today.
 */
export async function ScheduleCard({
  user,
  today,
  lesson = null,
}: {
  user: { id: string; timezone: string };
  today: CalendarDate;
  lesson?: NextLesson;
}) {
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
        <ScheduleBody result={result} user={user} today={today} lesson={lesson} />
      </div>
    </section>
  );
}

function ScheduleBody({
  result,
  user,
  today,
  lesson,
}: {
  result: Exclude<Awaited<ReturnType<typeof getSchedule>>, { status: "not-connected" }>;
  user: { timezone: string };
  today: CalendarDate;
  lesson: NextLesson;
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
  // The longest free block still ahead today, as a nudge to use it.
  const free = biggestFreeGap(blocksForDay(result.events, today, user.timezone), minutesNowIn(user.timezone));
  return (
    <>
      <DayEvents day={day} timezone={user.timezone} highlight={highlight} />
      {free && (
        <p className="mt-3 flex items-start gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/[0.04] px-3 py-2.5 text-sm">
          <Coffee aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            <span className="font-medium">
              Free {clockLabel(free.startMin)} – {clockLabel(free.endMin)}
            </span>{" "}
            <span className="text-muted-foreground">· {formatMinutes(free.endMin - free.startMin)}.</span>
            {lesson && (
              <>
                {" "}
                <Link href={lesson.href} className="font-medium text-primary hover:underline">
                  Good time for today&apos;s lesson
                </Link>
              </>
            )}
          </span>
        </p>
      )}
    </>
  );
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
