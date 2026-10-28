import { describe, expect, it } from "vitest";
import type { Weekday } from "@/lib/db/types";
import { checkinGrid, gridSummary } from "./grid";

const EVERY_DAY: Weekday[] = [0, 1, 2, 3, 4, 5, 6];
const today = "2026-10-28"; // a Wednesday

describe("checkinGrid", () => {
  it("covers the last N days, oldest first, ending today", () => {
    const grid = checkinGrid({ schedule: EVERY_DAY, checkins: new Set(), createdOn: "2026-01-01", today, days: 7 });
    expect(grid.map((d) => d.date)).toEqual([
      "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28",
    ]);
  });

  it("marks done, missed, today pending, and days before the habit existed", () => {
    const grid = checkinGrid({
      schedule: EVERY_DAY,
      checkins: new Set(["2026-10-26"]),
      createdOn: "2026-10-25",
      today,
      days: 5,
    });
    expect(grid.map((d) => d.status)).toEqual(["before", "missed", "done", "missed", "pending"]);
  });

  it("shows unscheduled days as off, and today as done once checked", () => {
    // Mon/Wed/Fri: Mon 26 was missed, Tue 27 is off, Wed 28 (today) is done.
    const grid = checkinGrid({
      schedule: [1, 3, 5],
      checkins: new Set(["2026-10-28"]),
      createdOn: "2026-01-01",
      today,
      days: 3,
    });
    expect(grid.map((d) => d.status)).toEqual(["missed", "off", "done"]);
  });

  it("counts a check-in even on a day before the recorded creation date", () => {
    const grid = checkinGrid({ schedule: EVERY_DAY, checkins: new Set(["2026-10-27"]), createdOn: today, today, days: 2 });
    expect(grid[0].status).toBe("done");
  });
});

describe("gridSummary", () => {
  it("counts done and missed scheduled days, ignoring off, before and pending", () => {
    const grid = checkinGrid({
      schedule: EVERY_DAY,
      checkins: new Set(["2026-10-26"]),
      createdOn: "2026-10-25",
      today,
      days: 5,
    });
    expect(gridSummary(grid)).toEqual({ done: 1, missed: 2, scheduled: 3 });
  });
});
