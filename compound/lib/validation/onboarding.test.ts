import { describe, expect, it } from "vitest";
import { onboardingSchema, type OnboardingInput } from "./onboarding";

const valid: OnboardingInput = {
  focus: {
    goal: "health",
    description: "Run a 5K without stopping by the end of the year.",
  },
  habits: [{ name: "Walk 20 minutes", schedule: [0, 1, 2, 3, 4, 5, 6] }],
  timezone: "Asia/Manila",
};

/** The error messages for an input, or [] if it's valid. */
function errorsFor(input: unknown) {
  const result = onboardingSchema.safeParse(input);
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.message);
}

describe("onboardingSchema", () => {
  it("accepts a valid onboarding", () => {
    expect(errorsFor(valid)).toEqual([]);
  });

  it("trims text and sorts and de-duplicates schedule days", () => {
    const data = onboardingSchema.parse({
      ...valid,
      focus: {
        goal: "custom",
        customLabel: "  Learn guitar  ",
        description: "  Play three full songs by summer.  ",
      },
      habits: [{ name: "  Pray  ", schedule: [5, 1, 3, 1] }],
    });
    expect(data.focus).toEqual({
      goal: "custom",
      customLabel: "Learn guitar",
      description: "Play three full songs by summer.",
    });
    expect(data.habits[0]).toEqual({ name: "Pray", schedule: [1, 3, 5] });
  });

  describe("focus", () => {
    it("requires a focus type", () => {
      const input = {
        ...valid,
        focus: { description: valid.focus.description },
      };
      expect(errorsFor(input)).toContain("Choose what you want to work on.");
    });

    it("rejects an unknown focus type", () => {
      const input = { ...valid, focus: { ...valid.focus, goal: "money" } };
      expect(errorsFor(input)).toContain("Choose what you want to work on.");
    });

    it("requires a name for a custom focus", () => {
      const input = {
        ...valid,
        focus: {
          goal: "custom",
          customLabel: "   ",
          description: valid.focus.description,
        },
      };
      expect(errorsFor(input)).toContain("Give your custom focus a name.");
    });

    it("requires a description of at least 20 characters, after trimming", () => {
      const input = {
        ...valid,
        focus: { goal: "health", description: "  Get fit.            " },
      };
      expect(errorsFor(input)[0]).toMatch(/at least 20 characters/);
    });

    it("rejects a description over 500 characters", () => {
      const input = {
        ...valid,
        focus: { goal: "health", description: "a".repeat(501) },
      };
      expect(errorsFor(input)).toContain(
        "Keep your description under 500 characters.",
      );
    });
  });

  describe("habits", () => {
    it("requires at least one habit", () => {
      expect(errorsFor({ ...valid, habits: [] })).toContain(
        "Add at least one habit.",
      );
    });

    it("allows at most 5 habits", () => {
      const habits = ["A", "B", "C", "D", "E", "F"].map((name) => ({
        name,
        schedule: [1],
      }));
      expect(errorsFor({ ...valid, habits })).toContain(
        "Add at most 5 habits.",
      );
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
      expect(errorsFor(input)).toContain(
        "Pick at least one day for each habit.",
      );
    });

    it.each([[7], [-1], [1.5]])("rejects the weekday %s", (day) => {
      const input = { ...valid, habits: [{ name: "Pray", schedule: [day] }] };
      expect(errorsFor(input)).not.toEqual([]);
    });
  });

  describe("timezone", () => {
    it.each(["America/New_York", "Europe/London", "UTC"])(
      "accepts %s",
      (timezone) => {
        expect(errorsFor({ ...valid, timezone })).toEqual([]);
      },
    );

    it.each(["Mars/Olympus_Mons", "", "GMT+99"])("rejects %j", (timezone) => {
      expect(errorsFor({ ...valid, timezone })).toContain(
        "Choose a valid timezone.",
      );
    });
  });
});
