import { describe, expect, it } from "vitest";
import type { Weekday } from "@/lib/db/types";
import { canFillIn, pastDays } from "./fill-in";

const WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5];
const today = "2026-10-31"; // Saturday

describe("canFillIn", () => {
  const gym = { schedule: WEEKDAYS, createdOn: "2026-10-01" };

  it("allows a scheduled day in the last week", () => {
    expect(canFillIn(gym, "2026-10-30", today)).toBe(true); // Friday
    expect(canFillIn(gym, "2026-10-26", today)).toBe(true); // Monday
  });

  it("refuses today and the future", () => {
    expect(canFillIn({ ...gym, schedule: [6] }, today, today)).toBe(false);
    expect(canFillIn(gym, "2026-11-02", today)).toBe(false);
  });

  it("refuses days more than a week back", () => {
    expect(canFillIn({ ...gym, schedule: [0, 1, 2, 3, 4, 5, 6] }, "2026-10-24", today)).toBe(true); // 7 days back
    expect(canFillIn({ ...gym, schedule: [0, 1, 2, 3, 4, 5, 6] }, "2026-10-23", today)).toBe(false); // 8 days back
  });

  it("refuses days the habit wasn't scheduled", () => {
    expect(canFillIn(gym, "2026-10-25", today)).toBe(false); // Sunday
  });

  it("refuses days before the habit existed", () => {
    expect(canFillIn({ ...gym, createdOn: "2026-10-29" }, "2026-10-28", today)).toBe(false);
    expect(canFillIn({ ...gym, createdOn: "2026-10-29" }, "2026-10-29", today)).toBe(true);
  });
});

describe("pastDays", () => {
  it("lists the seven days before today, oldest first, with done and open", () => {
    const days = pastDays({ schedule: WEEKDAYS, createdOn: "2026-10-01", checkins: new Set(["2026-10-29"]) }, today);
    expect(days.map((d) => d.date)).toEqual([
      "2026-10-24", "2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30",
    ]);
    expect(days.map((d) => d.open)).toEqual([false, false, true, true, true, true, true]);
    expect(days.filter((d) => d.done).map((d) => d.date)).toEqual(["2026-10-29"]);
  });
});
