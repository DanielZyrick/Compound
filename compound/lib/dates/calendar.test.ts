import { describe, expect, it } from "vitest";
import { addDays, formatLongDate, todayIn, weekdayOf } from "./calendar";

describe("todayIn", () => {
  // 2026-10-27 16:30 UTC: already the 28th in Manila (UTC+8), still the 27th in New York.
  const now = new Date("2026-10-27T16:30:00Z");

  it("uses the user's timezone, not UTC", () => {
    expect(todayIn("Asia/Manila", now)).toBe("2026-10-28");
    expect(todayIn("America/New_York", now)).toBe("2026-10-27");
    expect(todayIn("UTC", now)).toBe("2026-10-27");
  });

  it("changes date exactly at local midnight", () => {
    // Manila midnight on the 28th is 16:00 UTC on the 27th.
    expect(todayIn("Asia/Manila", new Date("2026-10-27T15:59:59Z"))).toBe("2026-10-27");
    expect(todayIn("Asia/Manila", new Date("2026-10-27T16:00:00Z"))).toBe("2026-10-28");
  });
});

describe("addDays", () => {
  it.each([
    ["2026-10-27", 1, "2026-10-28"],
    ["2026-10-31", 1, "2026-11-01"],
    ["2026-12-31", 1, "2027-01-01"],
    ["2026-03-01", -1, "2026-02-28"],
    ["2028-03-01", -1, "2028-02-29"], // leap year
    ["2026-10-27", 0, "2026-10-27"],
  ])("%s %+d → %s", (date, days, expected) => {
    expect(addDays(date, days)).toBe(expected);
  });

  it("is not affected by daylight saving changes", () => {
    // US clocks go back on 2026-11-01; every day is still one step.
    expect(addDays("2026-10-31", 2)).toBe("2026-11-02");
    expect(addDays("2026-03-07", 2)).toBe("2026-03-09");
  });
});

describe("weekdayOf", () => {
  it("returns 0 for Sunday through 6 for Saturday", () => {
    expect(weekdayOf("2026-10-25")).toBe(0); // Sunday
    expect(weekdayOf("2026-10-27")).toBe(2); // Tuesday
    expect(weekdayOf("2026-10-31")).toBe(6); // Saturday
  });
});

describe("formatLongDate", () => {
  it("formats without shifting the day", () => {
    expect(formatLongDate("2026-10-27")).toBe("Tuesday, October 27");
  });
});
