import { describe, expect, it } from "vitest";
import type { Weekday } from "@/lib/db/types";
import { habitWeek, weekStart } from "./week";

const EVERY_DAY: Weekday[] = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5];

describe("weekStart", () => {
  it("is the Monday of the week", () => {
    expect(weekStart("2026-10-29")).toBe("2026-10-26"); // Thursday
    expect(weekStart("2026-10-26")).toBe("2026-10-26"); // Monday itself
    expect(weekStart("2026-11-01")).toBe("2026-10-26"); // Sunday belongs to the week before
  });
});

describe("habitWeek", () => {
  const today = "2026-10-29"; // Thursday

  it("covers Monday to Sunday, with days after today in the future", () => {
    const week = habitWeek([], today);
    expect(week.map((d) => d.date)).toEqual([
      "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01",
    ]);
    expect(week.slice(4).every((d) => d.status === "future")).toBe(true);
    expect(week.slice(0, 4).every((d) => d.status === "rest")).toBe(true);
  });

  it("marks days done, partial, missed and pending", () => {
    const week = habitWeek(
      [
        { schedule: EVERY_DAY, createdOn: "2026-10-01", checkins: new Set(["2026-10-26", "2026-10-27"]) },
        { schedule: EVERY_DAY, createdOn: "2026-10-01", checkins: new Set(["2026-10-26"]) },
      ],
      today,
    );
    expect(week.slice(0, 4).map((d) => d.status)).toEqual(["done", "partial", "missed", "pending"]);
    expect(week[1]).toMatchObject({ done: 1, due: 2 });
  });

  it("only counts habits scheduled that day and created by then", () => {
    const week = habitWeek(
      [
        { schedule: WEEKDAYS, createdOn: "2026-10-28", checkins: new Set(["2026-10-28"]) },
        { schedule: [6], createdOn: "2026-10-01", checkins: new Set() }, // Saturdays only
      ],
      today,
    );
    expect(week.slice(0, 4).map((d) => d.status)).toEqual(["rest", "rest", "done", "pending"]);
  });
});
