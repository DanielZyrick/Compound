import { ExternalLink, MapPin } from "lucide-react";
import { timeIn, type CalendarEvent, type ScheduleDay } from "@/lib/calendar/events";
import { cn } from "@/lib/utils";

/** One day's events: all-day ones as chips, then timed ones with their times. */
export function DayEvents({
  day,
  timezone,
  highlight,
}: {
  day: ScheduleDay;
  timezone: string;
  /** The next or current event, marked so it stands out. */
  highlight?: { id: string; label: string };
}) {
  return (
    <div className="flex flex-col gap-2">
      {day.allDay.length > 0 && (
        <ul aria-label="All day" className="flex flex-wrap gap-1.5">
          {day.allDay.map((event) => (
            <li key={event.id} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {event.title}
            </li>
          ))}
        </ul>
      )}
      {day.timed.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {day.timed.map((event) => (
            <EventRow
              key={event.id}
              event={event}
              timezone={timezone}
              label={highlight?.id === event.id ? highlight.label : undefined}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function EventRow({ event, timezone, label }: { event: CalendarEvent; timezone: string; label?: string }) {
  return (
    <li
      className={cn(
        "flex gap-3 rounded-xl border px-3 py-2.5 text-sm",
        label && "border-primary/40 bg-primary/5",
      )}
    >
      <span className="w-[4.75rem] shrink-0 text-muted-foreground tabular-nums">
        {timeIn(event.start, timezone)}
        <span className="block text-xs">{timeIn(event.end, timezone)}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-medium break-words">{event.title}</span>
          {label && <span className="text-xs font-medium text-primary">{label}</span>}
        </span>
        {event.location && (
          <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin aria-hidden className="size-3 shrink-0" />
            <span className="truncate">{event.location}</span>
          </span>
        )}
      </span>
      {event.link && (
        <a
          href={event.link}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${event.title} in Google Calendar`}
          className="self-start rounded p-0.5 text-muted-foreground hover:text-foreground"
        >
          <ExternalLink className="size-3.5" />
        </a>
      )}
    </li>
  );
}
