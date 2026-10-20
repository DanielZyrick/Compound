import { describe, expect, it } from "vitest";
import { onboardingSchema, type OnboardingInput } from "./onboarding";

const valid: OnboardingInput = {
  goals: [{ goal: "health" }, { goal: "custom", customLabel: "Learn guitar" }],
  habits: [{ name: "Walk 20 minutes", schedule: [0, 1, 2, 3, 4, 5, 6] }],
  timezone: "Asia/Manila",
};

/** The error messages for an input, or [] if it's valid. */
function errorsFor(input: unknown) {
  const result = onboardingSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
}

describe("onboardingSchema", () => {
  it("accepts a valid onboarding", () => {
    expect(errorsFor(valid)).toEqual([]);
  });

  it("trims names and sorts and de-duplicates schedule days", () => {
    const data = onboardingSchema.parse({
      ...valid,
      goals: [{ goal: "custom", customLabel: "  Learn guitar  " }],
      habits: [{ name: "  Pray  ", schedule: [5, 1, 3, 1] }],
    });
    expect(data.goals[0]).toEqual({ goal: "custom", customLabel: "Learn guitar" });
    expect(data.habits[0]).toEqual({ name: "Pray", schedule: [1, 3, 5] });
  });

  describe("goals", () => {
    it("requires at least one goal", () => {
      expect(errorsFor({ ...valid, goals: [] })).toContain("Choose at least one goal.");
    });

    it("requires a label for a custom goal", () => {
      const input = { ...valid, goals: [{ goal: "custom", customLabel: "   " }] };
      expect(errorsFor(input)).toContain("Give your custom goal a name.");
    });

    it("rejects an unknown goal", () => {
      expect(errorsFor({ ...valid, goals: [{ goal: "money" }] })).not.toEqual([]);
    });

    it("rejects the same goal twice", () => {
      const input = { ...valid, goals: [{ goal: "faith" }, { goal: "faith" }] };
      expect(errorsFor(input)).toContain("Each goal can only be chosen once.");
    });
  });

  describe("habits", () => {
    it("requires at least one habit", () => {
      expect(errorsFor({ ...valid, habits: [] })).toContain("Add at least one habit.");
    });

    it("allows at most 5 habits", () => {
      const habits = ["A", "B", "C", "D", "E", "F"].map((name) => ({ name, schedule: [1] }));
      expect(errorsFor({ ...valid, habits })).toContain("Add at most 5 habits.");
    });

    it("requires a name", () => {
      const input = { ...valid, habits: [{ name: "  ", schedule: [1] }] };
      expect(errorsFor(input)).toContain("Every habit needs a name.");
    });

    it("rejects duplicate names, ignoring case", () => {
      const habits = [
        { name: "Pray", schedule: [1] },
        { name: "pray", schedule: [2] },
      ];
      expect(errorsFor({ ...valid, habits })).toContain(
        "Habit names must be different from each other.",
      );
    });

    it("requires at least one scheduled day", () => {
      const input = { ...valid, habits: [{ name: "Pray", schedule: [] }] };
      expect(errorsFor(input)).toContain("Pick at least one day for each habit.");
    });

    it.each([[7], [-1], [1.5]])("rejects the weekday %s", (day) => {
      const input = { ...valid, habits: [{ name: "Pray", schedule: [day] }] };
      expect(errorsFor(input)).not.toEqual([]);
    });
  });

  describe("timezone", () => {
    it.each(["America/New_York", "Europe/London", "UTC"])("accepts %s", (timezone) => {
      expect(errorsFor({ ...valid, timezone })).toEqual([]);
    });

    it.each(["Mars/Olympus_Mons", "", "GMT+99"])("rejects %j", (timezone) => {
      expect(errorsFor({ ...valid, timezone })).toContain("Choose a valid timezone.");
    });
  });
});
