"use client";

import { useEffect, useRef, useState } from "react";
import type { CalendarEvent } from "@/lib/calendar/events";
import type { Block, EventColor } from "@/lib/calendar/week";
import type { CalendarDate } from "@/lib/db/types";
import { cn } from "@/lib/utils";

export type WeekDay = { date: CalendarDate; allDay: Pick<CalendarEvent, "id" | "title">[]; blocks: Block[] };

/** One hour of the grid, in pixels. */
const HOUR_PX = 64;
const PX_PER_MIN = HOUR_PX / 60;

// Soft cards with a strong left edge, in the event's colour.
const CARD: Record<EventColor, string> = {
  blue: "bg-blue-50 border-blue-500 text-blue-950 hover:bg-blue-100",
  violet: "bg-violet-50 border-violet-500 text-violet-950 hover:bg-violet-100",
  green: "bg-emerald-50 border-emerald-500 text-emerald-950 hover:bg-emerald-100",
  amber: "bg-amber-50 border-amber-500 text-amber-950 hover:bg-amber-100",
  cyan: "bg-cyan-50 border-cyan-500 text-cyan-950 hover:bg-cyan-100",
  rose: "bg-rose-50 border-rose-500 text-rose-950 hover:bg-rose-100",
};

const WEEKDAY = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" });
const LONG_DAY = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
const asDate = (date: CalendarDate) => new Date(`${date}T00:00:00Z`);

function hourLabel(hour: number) {
  if (hour === 0 || hour === 24) return "12 AM";
  if (hour === 12) return "12 PM";
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

/** Minutes since local midnight in the user's timezone, right now. */
function nowMinutes(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, hourCycle: "h23", hour: "2-digit", minute: "2-digit" })
    .formatToParts(new Date());
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  return get("hour") * 60 + get("minute");
}

/**
 * The Schedule week: a grid of days and hours on wider screens, one day at a
 * time on phones. Events are placed by time; overlapping ones share the width.
 * Today's column has a line at the current time, moved every minute.
 */
export function WeekCalendar({
  days,
  hours,
  today,
  timezone,
}: {
  days: WeekDay[];
  hours: { from: number; to: number };
  today: CalendarDate;
  timezone: string;
}) {
  const hasToday = days.some((d) => d.date === today);
  const [now, setNow] = useState<number | null>(null);
  const [selected, setSelected] = useState<CalendarDate>(hasToday ? today : days[0].date);
  const scroller = useRef<HTMLDivElement>(null);
  const phoneScroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasToday) return;
    const tick = () => setNow(nowMinutes(timezone));
    tick();
    const timer = setInterval(tick, 60_000);
    return () => clearInterval(timer);
  }, [hasToday, timezone]);

  // Open near the current time (or the first event), not at the top of the day.
  useEffect(() => {
    const firstEvent = Math.min(...days.flatMap((d) => d.blocks.map((b) => b.startMin)), Infinity);
    const focus = hasToday ? nowMinutes(timezone) : firstEvent;
    if (!Number.isFinite(focus)) return;
    const top = Math.max(0, (focus - hours.from * 60 - 60) * PX_PER_MIN);
    scroller.current?.scrollTo({ top });
    phoneScroller.current?.scrollTo({ top });
  }, [days, hours.from, hasToday, timezone]);

  const hourList = Array.from({ length: hours.to - hours.from }, (_, i) => hours.from + i);
  const height = (hours.to - hours.from) * HOUR_PX;
  const anyAllDay = days.some((d) => d.allDay.length > 0);
  const selectedDay = days.find((d) => d.date === selected) ?? days[0];

  return (
    <>
      {/* Wider screens: the whole week. */}
      <div className="hidden overflow-hidden rounded-2xl border shadow-card md:block">
        <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b bg-muted/40">
          <div />
          {days.map((day) => (
            <DayHeading key={day.date} date={day.date} isToday={day.date === today} />
          ))}
        </div>
        {anyAllDay && (
          <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b">
            <div className="self-center pr-2 text-right text-[11px] text-muted-foreground">All day</div>
            {days.map((day) => (
              <AllDay key={day.date} events={day.allDay} className="border-l p-1" />
            ))}
          </div>
        )}
        <div ref={scroller} className="max-h-[calc(100vh-17rem)] min-h-80 overflow-y-auto">
          <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]" style={{ height }}>
            <HourLabels hours={hourList} />
            {days.map((day) => (
              <DayColumn
                key={day.date}
                day={day}
                hours={hours}
                hourList={hourList}
                now={day.date === today ? now : null}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Phones: one day at a time. */}
      <div className="md:hidden">
        <div role="tablist" aria-label="Day" className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const isSelected = day.date === selected;
            return (
              <button
                key={day.date}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-label={LONG_DAY.format(asDate(day.date))}
                onClick={() => setSelected(day.date)}
                className={cn(
                  "flex flex-col items-center rounded-xl py-1.5 text-center outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                <span className={cn("text-[11px]", !isSelected && "text-muted-foreground")}>
                  {WEEKDAY.format(asDate(day.date))}
                </span>
                <span className={cn("text-sm font-semibold", day.date === today && !isSelected && "text-primary")}>
                  {Number(day.date.slice(8))}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "mt-0.5 size-1 rounded-full",
                    day.blocks.length + day.allDay.length > 0 ? (isSelected ? "bg-primary-foreground" : "bg-primary") : "bg-transparent",
                  )}
                />
              </button>
            );
          })}
        </div>
        <h2 className="mt-4 text-sm font-semibold">{LONG_DAY.format(asDate(selectedDay.date))}</h2>
        {selectedDay.allDay.length > 0 && <AllDay events={selectedDay.allDay} className="mt-2" />}
        <div ref={phoneScroller} className="mt-2 max-h-[calc(100vh-20rem)] min-h-80 overflow-y-auto rounded-2xl border">
          <div className="grid grid-cols-[3.5rem_minmax(0,1fr)]" style={{ height }}>
            <HourLabels hours={hourList} />
            <DayColumn
              day={selectedDay}
              hours={hours}
              hourList={hourList}
              now={selectedDay.date === today ? now : null}
            />
          </div>
        </div>
        {selectedDay.blocks.length === 0 && selectedDay.allDay.length === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">Nothing planned.</p>
        )}
      </div>
    </>
  );
}

function DayHeading({ date, isToday }: { date: CalendarDate; isToday: boolean }) {
  return (
    <div
      aria-label={LONG_DAY.format(asDate(date))}
      aria-current={isToday ? "date" : undefined}
      className={cn("flex flex-col items-center gap-0.5 border-l py-2", isToday && "bg-primary/5")}
    >
      <span className={cn("text-xs", isToday ? "font-medium text-primary" : "text-muted-foreground")}>
        {WEEKDAY.format(asDate(date))}
      </span>
      <span
        className={cn(
          "grid size-7 place-items-center rounded-full text-sm font-semibold tabular-nums",
          isToday && "bg-primary text-primary-foreground",
        )}
      >
        {Number(date.slice(8))}
      </span>
    </div>
  );
}

function AllDay({ events, className }: { events: WeekDay["allDay"]; className?: string }) {
  return (
    <ul aria-label="All day" className={cn("flex min-w-0 flex-col gap-1", className)}>
      {events.map((e) => (
        <li key={e.id} className="truncate rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {e.title}
        </li>
      ))}
    </ul>
  );
}

function HourLabels({ hours }: { hours: number[] }) {
  return (
    <div aria-hidden className="relative">
      {hours.map((hour, i) => (
        <span
          key={hour}
          className="absolute right-2 -translate-y-1/2 text-[11px] text-muted-foreground tabular-nums"
          style={{ top: i * HOUR_PX }}
        >
          {i === 0 ? "" : hourLabel(hour)}
        </span>
      ))}
    </div>
  );
}

function DayColumn({
  day,
  hours,
  hourList,
  now,
}: {
  day: WeekDay;
  hours: { from: number; to: number };
  hourList: number[];
  now: number | null;
}) {
  const offset = hours.from * 60;
  const showNow = now !== null && now >= offset && now <= hours.to * 60;
  return (
    <div aria-label={`Events on ${LONG_DAY.format(asDate(day.date))}`} className="relative border-l">
      {hourList.map((hour, i) => (
        <div key={hour} aria-hidden className="absolute inset-x-0 border-t border-border/70" style={{ top: i * HOUR_PX }} />
      ))}
      {day.blocks.map((b) => {
        const top = (b.startMin - offset) * PX_PER_MIN;
        const tall = (b.endMin - b.startMin) * PX_PER_MIN;
        const shown = Math.max(tall, 22);
        const card = (
          <>
            <span className="block truncate font-medium">{b.title}</span>
            {shown >= 40 && <span className="block truncate opacity-75">{b.timeLabel}</span>}
            {shown >= 60 && b.location && <span className="block truncate opacity-75">{b.location}</span>}
          </>
        );
        const className = cn(
          "absolute overflow-hidden rounded-md border-l-[3px] px-1.5 py-1 text-[11px] leading-tight shadow-sm transition-colors",
          CARD[b.color],
        );
        const style = {
          top: top + 1,
          height: shown - 2,
          left: `calc(${(b.col / b.cols) * 100}% + 2px)`,
          width: `calc(${100 / b.cols}% - 4px)`,
        };
        const label = `${b.title}, ${b.timeLabel}${b.location ? `, ${b.location}` : ""}`;
        return b.link ? (
          <a key={b.id} href={b.link} target="_blank" rel="noopener noreferrer" aria-label={label} className={className} style={style}>
            {card}
          </a>
        ) : (
          <div key={b.id} role="group" aria-label={label} className={className} style={style}>
            {card}
          </div>
        );
      })}
      {showNow && (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 z-10" style={{ top: (now - offset) * PX_PER_MIN }}>
          <div className="absolute -top-[4px] -left-[5px] size-2.5 rounded-full bg-primary" />
          <div className="h-0.5 bg-primary" />
        </div>
      )}
    </div>
  );
}
