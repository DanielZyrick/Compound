import { describe, expect, it } from "vitest";
import {
  dateIn,
  demoEvents,
  describeStartsIn,
  groupByDay,
  nextEvent,
  parseGoogleEvents,
  startOfDayIn,
  timeIn,
  type CalendarEvent,
} from "./events";

describe("parseGoogleEvents", () => {
  it("reads timed and all-day events", () => {
    const events = parseGoogleEvents([
      {
        id: "a",
        summary: "Standup",
        start: { dateTime: "2026-11-03T09:30:00+08:00" },
        end: { dateTime: "2026-11-03T09:45:00+08:00" },
        htmlLink: "https://www.google.com/calendar/event?eid=a",
      },
      { id: "b", summary: "Holiday", start: { date: "2026-11-04" }, end: { date: "2026-11-05" } },
    ]);
    expect(events).toEqual([
      expect.objectContaining({ id: "a", title: "Standup", allDay: false, link: "https://www.google.com/calendar/event?eid=a" }),
      expect.objectContaining({ id: "b", title: "Holiday", allDay: true, start: "2026-11-04", end: "2026-11-05" }),
    ]);
  });

  it("drops cancelled and declined events, and names untitled ones", () => {
    const time = { start: { dateTime: "2026-11-03T09:00:00Z" }, end: { dateTime: "2026-11-03T10:00:00Z" } };
    const events = parseGoogleEvents([
      { id: "x", status: "cancelled", ...time },
      { id: "y", attendees: [{ self: true, responseStatus: "declined" }], ...time },
      { id: "z", ...time },
    ]);
    expect(events.map((e) => [e.id, e.title])).toEqual([["z", "(No title)"]]);
  });

  it("only keeps https links", () => {
    const [event] = parseGoogleEvents([
      { id: "a", htmlLink: "javascript:alert(1)", start: { date: "2026-11-03" }, end: { date: "2026-11-04" } },
    ]);
    expect(event.link).toBeNull();
  });
});

describe("startOfDayIn", () => {
  it("finds local midnight", () => {
    expect(startOfDayIn("2026-11-03", "Asia/Manila").toISOString()).toBe("2026-11-02T16:00:00.000Z");
    expect(startOfDayIn("2026-11-03", "UTC").toISOString()).toBe("2026-11-03T00:00:00.000Z");
  });

  it("handles daylight saving changes", () => {
    expect(startOfDayIn("2026-03-08", "America/New_York").toISOString()).toBe("2026-03-08T05:00:00.000Z");
    expect(startOfDayIn("2026-03-09", "America/New_York").toISOString()).toBe("2026-03-09T04:00:00.000Z");
  });
});

describe("dateIn and timeIn", () => {
  it("use the user's timezone", () => {
    expect(dateIn("2026-11-02T17:00:00Z", "Asia/Manila")).toBe("2026-11-03");
    expect(dateIn("2026-11-02T17:00:00Z", "UTC")).toBe("2026-11-02");
    expect(timeIn("2026-11-03T01:30:00Z", "Asia/Manila")).toBe("9:30 AM");
  });
});

describe("groupByDay", () => {
  const events = demoEvents("2026-11-03", "Asia/Manila");

  it("puts timed events on their local day, in order", () => {
    const [today, tomorrow] = groupByDay(events, "2026-11-03", 2, "Asia/Manila");
    expect(today.timed.map((e) => e.title)).toEqual(["Team standup", "Lunch with Ana", "Design sync", "Portfolio review"]);
    expect(today.allDay).toEqual([]);
    expect(tomorrow.allDay.map((e) => e.title)).toEqual(["Mom's birthday"]);
  });

  it("shows a multi-day all-day event on every day it covers", () => {
    const trip: CalendarEvent = { id: "t", title: "Trip", allDay: true, start: "2026-11-03", end: "2026-11-06", location: null, link: null, colorId: null };
    const days = groupByDay([trip], "2026-11-02", 5, "UTC");
    expect(days.map((d) => d.allDay.length)).toEqual([0, 1, 1, 1, 0]);
  });
});

describe("nextEvent", () => {
  const [standup, lunch] = demoEvents("2026-11-03", "Asia/Manila");

  it("is the next event to start, with minutes until it", () => {
    const now = new Date(Date.parse(standup.start) - 25 * 60_000);
    expect(nextEvent([standup, lunch], now)).toEqual({ event: standup, minutes: 25 });
  });

  it("is the current event while it's happening", () => {
    const now = new Date(Date.parse(standup.start) + 5 * 60_000);
    expect(nextEvent([standup, lunch], now)).toEqual({ event: standup, minutes: 0 });
  });

  it("is null when the day is done", () => {
    expect(nextEvent([standup, lunch], new Date(Date.parse(lunch.end) + 1))).toBeNull();
  });
});

describe("describeStartsIn", () => {
  it("reads naturally", () => {
    expect(describeStartsIn(0)).toBe("Now");
    expect(describeStartsIn(25)).toBe("in 25 min");
    expect(describeStartsIn(120)).toBe("in 2 h");
    expect(describeStartsIn(125)).toBe("in 2 h 5 min");
  });
});
