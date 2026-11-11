import { describe, expect, it } from "vitest";
import { biggestFreeGap, clockLabel, minutesNowIn } from "./free";

const at = (hour: number, minute = 0) => hour * 60 + minute;
const busy = (from: number, to: number) => ({ startMin: from, endMin: to });

// Standup 9:30–9:45, lunch 12:30–1:30 with a sync inside it, review 4:00–5:00.
const DAY = [busy(at(9, 30), at(9, 45)), busy(at(12, 30), at(13, 30)), busy(at(13), at(13, 30)), busy(at(16), at(17))];

describe("biggestFreeGap", () => {
  it("finds the longest gap left in the day", () => {
    // In the morning: 5:00 PM – 9:00 PM (4h) beats 9:45 – 12:30 (2h 45m).
    expect(biggestFreeGap(DAY, at(7))).toEqual({ startMin: at(17), endMin: at(21) });
  });

  it("merges overlapping events", () => {
    // Lunch and the sync overlap: the gap after them starts at 1:30, not 1:00.
    const day = [busy(at(12, 30), at(13, 30)), busy(at(13), at(13, 30)), busy(at(16), at(21))];
    expect(biggestFreeGap(day, at(12))).toEqual({ startMin: at(13, 30), endMin: at(16) });
  });

  it("only looks ahead, from the next 5-minute mark", () => {
    const day = [busy(at(9), at(10)), busy(at(14), at(21))];
    expect(biggestFreeGap(day, at(11, 2))).toEqual({ startMin: at(11, 5), endMin: at(14) });
  });

  it("waits for an event that's happening now to end", () => {
    const day = [busy(at(10), at(11)), busy(at(15), at(21))];
    expect(biggestFreeGap(day, at(10, 30))).toEqual({ startMin: at(11), endMin: at(15) });
  });

  it("stays inside 8 AM to 9 PM", () => {
    const day = [busy(at(10), at(11)), busy(at(11, 30), at(20))];
    // Before 8: 8:00–10:00, not 5:00–10:00. And 8:00 PM–9:00 PM, not until midnight.
    expect(biggestFreeGap(day, at(5))).toEqual({ startMin: at(8), endMin: at(10) });
    expect(biggestFreeGap(day, at(12))).toEqual({ startMin: at(20), endMin: at(21) });
  });

  it("ignores gaps shorter than 30 minutes", () => {
    const day = [busy(at(8), at(12)), busy(at(12, 20), at(20, 45))];
    expect(biggestFreeGap(day, at(9))).toBeNull();
  });

  it("picks the earlier gap in a tie", () => {
    const day = [busy(at(8), at(9)), busy(at(11), at(12)), busy(at(14), at(21))];
    expect(biggestFreeGap(day, at(8))).toEqual({ startMin: at(9), endMin: at(11) });
  });

  it("has nothing to say on a day without events, or late at night", () => {
    expect(biggestFreeGap([], at(10))).toBeNull();
    expect(biggestFreeGap(DAY, at(20, 45))).toBeNull();
    expect(biggestFreeGap(DAY, at(23))).toBeNull();
  });
});

describe("clockLabel and minutesNowIn", () => {
  it("writes minutes as a clock time", () => {
    expect(clockLabel(0)).toBe("12:00 AM");
    expect(clockLabel(at(9, 5))).toBe("9:05 AM");
    expect(clockLabel(at(12))).toBe("12:00 PM");
    expect(clockLabel(at(21))).toBe("9:00 PM");
  });

  it("reads the time in the user's timezone", () => {
    const now = new Date("2026-11-11T06:41:00Z");
    expect(minutesNowIn("Asia/Manila", now)).toBe(at(14, 41));
    expect(minutesNowIn("UTC", now)).toBe(at(6, 41));
  });
});
