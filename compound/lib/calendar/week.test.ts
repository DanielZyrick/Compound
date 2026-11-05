import { describe, expect, it } from "vitest";
import type { CalendarEvent } from "./events";
import { blocksForDay, colorFor, EVENT_COLORS, hourRange, layoutDay, mondayOf, weekLabel } from "./week";

const tz = "Asia/Manila"; // UTC+8, no daylight saving
const event = (id: string, start: string, end: string): CalendarEvent => ({
  id,
  title: id,
  allDay: false,
  start,
  end,
  location: null,
  link: null,
  colorId: null,
});
const block = (id: string, startMin: number, endMin: number) => ({
  id,
  title: id,
  location: null,
  link: null,
  color: "blue" as const,
  startMin,
  endMin,
  timeLabel: "",
});

describe("mondayOf and weekLabel", () => {
  it("finds the Monday, with Sunday belonging to the week before", () => {
    expect(mondayOf("2026-11-05")).toBe("2026-11-02"); // Thursday
    expect(mondayOf("2026-11-02")).toBe("2026-11-02");
    expect(mondayOf("2026-11-08")).toBe("2026-11-02"); // Sunday
  });

  it("labels a week, across months too", () => {
    expect(weekLabel("2026-11-02")).toBe("Nov 2 – 8, 2026");
    expect(weekLabel("2026-10-26")).toBe("Oct 26 – Nov 1, 2026");
  });
});

describe("colorFor", () => {
  it("uses the colour picked in Google Calendar", () => {
    expect(colorFor({ id: "a", colorId: "11" })).toBe("rose");
    expect(colorFor({ id: "a", colorId: "2" })).toBe("green");
  });

  it("otherwise picks a steady colour per event", () => {
    const color = colorFor({ id: "abc", colorId: null });
    expect(EVENT_COLORS).toContain(color);
    expect(colorFor({ id: "abc", colorId: null })).toBe(color);
    expect(colorFor({ id: "abc", colorId: "99" })).toBe(color); // unknown colours fall back too
  });
});

describe("blocksForDay", () => {
  it("places an event by its local minutes", () => {
    const [b] = blocksForDay([event("standup", "2026-11-05T01:30:00Z", "2026-11-05T01:45:00Z")], "2026-11-05", tz);
    expect(b).toMatchObject({ startMin: 9 * 60 + 30, endMin: 9 * 60 + 45 });
    expect(b.timeLabel).toBe("9:30 AM – 9:45 AM");
  });

  it("cuts an event that crosses midnight at the day's edges, on both days", () => {
    const late = event("late", "2026-11-05T14:00:00Z", "2026-11-05T18:00:00Z"); // 10 PM to 2 AM local
    expect(blocksForDay([late], "2026-11-05", tz)[0]).toMatchObject({ startMin: 22 * 60, endMin: 24 * 60 });
    expect(blocksForDay([late], "2026-11-06", tz)[0]).toMatchObject({ startMin: 0, endMin: 2 * 60 });
  });

  it("leaves out all-day events and other days", () => {
    const allDay: CalendarEvent = { ...event("trip", "2026-11-05", "2026-11-06"), allDay: true };
    const other = event("other", "2026-11-07T01:00:00Z", "2026-11-07T02:00:00Z");
    expect(blocksForDay([allDay, other], "2026-11-05", tz)).toEqual([]);
  });
});

describe("layoutDay", () => {
  it("gives events that don't overlap the full width", () => {
    const laid = layoutDay([block("a", 540, 600), block("b", 600, 660)]);
    expect(laid.map((b) => [b.id, b.col, b.cols])).toEqual([
      ["a", 0, 1],
      ["b", 0, 1],
    ]);
  });

  it("puts overlapping events side by side", () => {
    const laid = layoutDay([block("lunch", 750, 810), block("sync", 780, 810)]);
    expect(laid.map((b) => [b.id, b.col, b.cols])).toEqual([
      ["lunch", 0, 2],
      ["sync", 1, 2],
    ]);
  });

  it("reuses a free column within a chain of overlaps", () => {
    // a overlaps b, b overlaps c, but a has ended when c starts: two columns, not three.
    const laid = layoutDay([block("a", 540, 600), block("b", 570, 660), block("c", 610, 640)]);
    expect(laid.map((b) => [b.id, b.col, b.cols])).toEqual([
      ["a", 0, 2],
      ["b", 1, 2],
      ["c", 0, 2],
    ]);
  });

  it("treats very short events as long enough not to sit on the next one", () => {
    const laid = layoutDay([block("tiny", 540, 545), block("next", 550, 600)]);
    expect(laid.map((b) => [b.id, b.col, b.cols])).toEqual([
      ["tiny", 0, 2],
      ["next", 1, 2],
    ]);
  });
});

describe("hourRange", () => {
  it("shows 8 AM to 6 PM by default", () => {
    expect(hourRange([])).toEqual({ from: 8, to: 18 });
  });

  it("widens to fit early and late events", () => {
    expect(hourRange([block("run", 6 * 60, 7 * 60), block("late", 20 * 60, 21 * 60 + 30)])).toEqual({ from: 6, to: 22 });
  });
});
