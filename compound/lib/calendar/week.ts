import { addDays } from "@/lib/dates/calendar";
import type { CalendarDate } from "@/lib/db/types";
import { startOfDayIn, timeIn, type CalendarEvent } from "./events";

// The Schedule week grid: where each timed event sits in its day column, how
// overlapping events share the width, which hours to show, and a colour per
// event. Pure, so it's easy to test.

const DAY_MINUTES = 24 * 60;
/** Very short events still get room for their title. */
export const MIN_BLOCK_MINUTES = 20;

export type Block = {
  id: string;
  title: string;
  location: string | null;
  link: string | null;
  color: EventColor;
  /** Minutes from the day's local midnight, clamped to the day. */
  startMin: number;
  endMin: number;
  /** "9:30 AM – 10:00 AM" in the user's timezone. */
  timeLabel: string;
  /** Overlapping events share the width: this one is column `col` of `cols`. */
  col: number;
  cols: number;
};

/** The Monday of the week containing `date`. */
export function mondayOf(date: CalendarDate): CalendarDate {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(date, -((weekday + 6) % 7));
}

/** "Nov 2 – 8, 2026", or "Oct 26 – Nov 1, 2026" across months. */
export function weekLabel(monday: CalendarDate): string {
  const sunday = addDays(monday, 6);
  const fmt = (date: CalendarDate, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
  const year = fmt(sunday, { year: "numeric" });
  if (monday.slice(0, 7) === sunday.slice(0, 7)) {
    return `${fmt(monday, { month: "short", day: "numeric" })} – ${fmt(sunday, { day: "numeric" })}, ${year}`;
  }
  return `${fmt(monday, { month: "short", day: "numeric" })} – ${fmt(sunday, { month: "short", day: "numeric" })}, ${year}`;
}

// Event colours, named after Google's. The calendar draws them as muted inks
// that sit well on Compound's paper.
export const EVENT_COLORS = ["blue", "violet", "green", "amber", "cyan", "rose"] as const;
export type EventColor = (typeof EVENT_COLORS)[number];

// Google's event colours ("1" to "11") mapped to the nearest card colour.
const GOOGLE_COLORS: Record<string, EventColor> = {
  "1": "violet", // Lavender
  "2": "green", // Sage
  "3": "violet", // Grape
  "4": "rose", // Flamingo
  "5": "amber", // Banana
  "6": "amber", // Tangerine
  "7": "cyan", // Peacock
  "8": "blue", // Graphite
  "9": "blue", // Blueberry
  "10": "green", // Basil
  "11": "rose", // Tomato
};

/** The colour picked in Google Calendar, or a steady one per event so the week isn't all one colour. */
export function colorFor(event: Pick<CalendarEvent, "id" | "colorId">): EventColor {
  if (event.colorId && GOOGLE_COLORS[event.colorId]) return GOOGLE_COLORS[event.colorId];
  let hash = 0;
  for (const char of event.id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return EVENT_COLORS[hash % EVENT_COLORS.length];
}

/**
 * The timed events that touch one day, with their minutes on that day. An
 * event crossing midnight shows on both days, cut at the day's edges.
 */
export function blocksForDay(events: CalendarEvent[], date: CalendarDate, timezone: string): Omit<Block, "col" | "cols">[] {
  const dayStart = startOfDayIn(date, timezone).getTime();
  const dayEnd = startOfDayIn(addDays(date, 1), timezone).getTime();
  return events
    .filter((e) => !e.allDay && Date.parse(e.start) < dayEnd && Date.parse(e.end) > dayStart)
    .map((e) => {
      const startMin = Math.max(0, Math.round((Date.parse(e.start) - dayStart) / 60_000));
      const endMin = Math.min(DAY_MINUTES, Math.round((Date.parse(e.end) - dayStart) / 60_000));
      return {
        id: e.id,
        title: e.title,
        location: e.location,
        link: e.link,
        color: colorFor(e),
        startMin,
        endMin: Math.max(endMin, startMin + 1),
        timeLabel: `${timeIn(e.start, timezone)} – ${timeIn(e.end, timezone)}`,
      };
    })
    .sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);
}

/**
 * Overlapping events side by side. Events that overlap (directly or through
 * a chain) form a group; each takes the first free column, and every event in
 * the group shares the group's column count. Blocks shorter than
 * MIN_BLOCK_MINUTES are treated as that long, so tiny ones don't sit on top
 * of the next.
 */
export function layoutDay(blocks: Omit<Block, "col" | "cols">[]): Block[] {
  const sorted = [...blocks].sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);
  const shownEnd = (b: { startMin: number; endMin: number }) => Math.max(b.endMin, b.startMin + MIN_BLOCK_MINUTES);
  const placed: Block[] = [];
  let group: Block[] = [];
  let columnEnds: number[] = [];
  let groupEnd = -1;

  const closeGroup = () => {
    for (const b of group) b.cols = columnEnds.length;
    placed.push(...group);
    group = [];
    columnEnds = [];
  };

  for (const block of sorted) {
    if (block.startMin >= groupEnd) {
      closeGroup();
      groupEnd = -1;
    }
    let col = columnEnds.findIndex((end) => end <= block.startMin);
    if (col === -1) {
      col = columnEnds.length;
      columnEnds.push(0);
    }
    columnEnds[col] = shownEnd(block);
    groupEnd = Math.max(groupEnd, shownEnd(block));
    group.push({ ...block, col, cols: 1 });
  }
  closeGroup();
  return placed;
}

/** The hours to show: from the earliest event (or 8 AM) to the latest (or 6 PM). */
export function hourRange(blocks: { startMin: number; endMin: number }[]): { from: number; to: number } {
  let from = 8;
  let to = 18;
  for (const b of blocks) {
    from = Math.min(from, Math.floor(b.startMin / 60));
    to = Math.max(to, Math.ceil(b.endMin / 60));
  }
  return { from: Math.max(0, from), to: Math.min(24, to) };
}

/** "45m", "2h", "2h 30m". */
function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/**
 * How full a day is, under its date: "Free", "1 event", "3 events · 2h 30m".
 * The time is how long the day is busy, so overlapping events count once.
 */
export function dayLoad(blocks: { startMin: number; endMin: number }[], allDayCount: number): string {
  const count = blocks.length + allDayCount;
  if (count === 0) return "Free";
  const events = count === 1 ? "1 event" : `${count} events`;

  let busy = 0;
  let end = -1;
  for (const b of [...blocks].sort((x, y) => x.startMin - y.startMin)) {
    if (b.endMin <= end) continue;
    busy += b.endMin - Math.max(b.startMin, end);
    end = b.endMin;
  }
  return busy > 0 ? `${events} · ${formatMinutes(busy)}` : events;
}
