import { describe, expect, it } from "vitest";
import type { Weekday } from "@/lib/db/types";
import { bestStreak, currentStreak } from "./streaks";

const EVERY_DAY: Weekday[] = [0, 1, 2, 3, 4, 5, 6];
const MON_WED_FRI: Weekday[] = [1, 3, 5];

// Reference week (2026): Sun 25, Mon 26, Tue 27, Wed 28, Thu 29, Fri 30, Sat 31 October.

describe("currentStreak", () => {
  it("is 0 with no check-ins", () => {
    expect(currentStreak({ schedule: EVERY_DAY, checkins: [], today: "2026-10-27" })).toBe(0);
  });

  it("counts consecutive days ending today", () => {
    const checkins = ["2026-10-25", "2026-10-26", "2026-10-27"];
    expect(currentStreak({ schedule: EVERY_DAY, checkins, today: "2026-10-27" })).toBe(3);
  });

  it("keeps the streak while today isn't checked yet", () => {
    const checkins = ["2026-10-25", "2026-10-26"];
    expect(currentStreak({ schedule: EVERY_DAY, checkins, today: "2026-10-27" })).toBe(2);
  });

  it("breaks when a past scheduled day was missed", () => {
    // Missed the 26th.
    const checkins = ["2026-10-24", "2026-10-25", "2026-10-27"];
    expect(currentStreak({ schedule: EVERY_DAY, checkins, today: "2026-10-27" })).toBe(1);
  });

  it("is 0 when yesterday was missed and today isn't checked", () => {
    const checkins = ["2026-10-24", "2026-10-25"];
    expect(currentStreak({ schedule: EVERY_DAY, checkins, today: "2026-10-27" })).toBe(0);
  });

  it("skips unscheduled days", () => {
    // Mon 19, Wed 21, Fri 23, Mon 26: the gaps are unscheduled days.
    const checkins = ["2026-10-19", "2026-10-21", "2026-10-23", "2026-10-26"];
    expect(currentStreak({ schedule: MON_WED_FRI, checkins, today: "2026-10-27" })).toBe(4);
  });

  it("breaks on a missed scheduled day even with unscheduled days around it", () => {
    // Missed Wed 21.
    const checkins = ["2026-10-19", "2026-10-23", "2026-10-26"];
    expect(currentStreak({ schedule: MON_WED_FRI, checkins, today: "2026-10-27" })).toBe(2);
  });

  it("ignores check-ins on unscheduled days", () => {
    // Tue 27 is not scheduled; it neither adds to nor breaks the streak.
    const checkins = ["2026-10-23", "2026-10-26", "2026-10-27"];
    expect(currentStreak({ schedule: MON_WED_FRI, checkins, today: "2026-10-27" })).toBe(2);
  });

  it("counts across month and year boundaries", () => {
    const checkins = ["2026-12-30", "2026-12-31", "2027-01-01"];
    expect(currentStreak({ schedule: EVERY_DAY, checkins, today: "2027-01-01" })).toBe(3);
  });

  it("does not depend on check-in order or duplicates", () => {
    const checkins = ["2026-10-27", "2026-10-25", "2026-10-26", "2026-10-26"];
    expect(currentStreak({ schedule: EVERY_DAY, checkins, today: "2026-10-27" })).toBe(3);
  });
});

describe("bestStreak", () => {
  it("is 0 with no check-ins", () => {
    expect(bestStreak({ schedule: EVERY_DAY, checkins: [] })).toBe(0);
  });

  it("finds the longest run, not the latest one", () => {
    // 3 in a row (19–21), a gap, then 2 in a row (25–26).
    const checkins = ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-25", "2026-10-26"];
    expect(bestStreak({ schedule: EVERY_DAY, checkins })).toBe(3);
  });

  it("skips unscheduled days within a run", () => {
    // Mon/Wed/Fri across two weeks, nothing missed.
    const checkins = ["2026-10-19", "2026-10-21", "2026-10-23", "2026-10-26", "2026-10-28"];
    expect(bestStreak({ schedule: MON_WED_FRI, checkins })).toBe(5);
  });

  it("ignores check-ins on unscheduled days and duplicates", () => {
    const checkins = ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-21"];
    expect(bestStreak({ schedule: MON_WED_FRI, checkins })).toBe(2);
  });

  it("is never smaller than the current streak", () => {
    const checkins = ["2026-10-25", "2026-10-26", "2026-10-27"];
    const today = "2026-10-27";
    expect(bestStreak({ schedule: EVERY_DAY, checkins })).toBeGreaterThanOrEqual(
      currentStreak({ schedule: EVERY_DAY, checkins, today }),
    );
  });
});
