import { describe, expect, it } from "vitest";
import type { Weekday } from "@/lib/db/types";
import { describeSchedule } from "./schedule";

describe("describeSchedule", () => {
  it.each<[Weekday[], string]>([
    [[0, 1, 2, 3, 4, 5, 6], "Every day"],
    [[1, 2, 3, 4, 5], "Weekdays"],
    [[6, 0], "Weekends"],
    [[5, 1, 3], "Mon, Wed, Fri"],
    [[0, 1], "Mon, Sun"],
    [[2], "Tue"],
  ])("%j → %s", (days, expected) => {
    expect(describeSchedule(days)).toBe(expected);
  });

  it("ignores duplicate days", () => {
    expect(describeSchedule([1, 1, 2, 3, 4, 5])).toBe("Weekdays");
  });
});
