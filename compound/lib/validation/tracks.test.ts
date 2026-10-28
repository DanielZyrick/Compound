import { describe, expect, it } from "vitest";
import { newTrackSchema } from "./tracks";

const messages = (input: unknown) => {
  const result = newTrackSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((i) => i.message);
};

describe("newTrackSchema", () => {
  it("accepts a skill track", () => {
    expect(messages({ type: "skill", topic: "SQL", level: "beginner", totalDays: 14, addHabit: true })).toEqual([]);
  });

  it("accepts a reading track without topic, level or length", () => {
    expect(messages({ type: "reading", readingPlan: "john-21", addHabit: false })).toEqual([]);
  });

  it("asks for a type when none is chosen", () => {
    expect(messages({ type: null, addHabit: true })).toContain("Choose a track type.");
  });

  it("asks for a plan on a reading track and rejects unknown plans", () => {
    expect(messages({ type: "reading", readingPlan: null, addHabit: true })).toContain("Choose a reading plan.");
    expect(messages({ type: "reading", readingPlan: "genesis-50", addHabit: true })).toContain("Choose a reading plan.");
  });

  it("asks for the AI track fields", () => {
    const errors = messages({ type: "thinking", topic: "", level: null, totalDays: null, addHabit: true });
    expect(errors).toEqual(
      expect.arrayContaining([
        "Tell us what you want to learn (at least 3 characters).",
        "Choose your level.",
        "Choose a length.",
      ]),
    );
  });

  it("rejects a length that isn't offered", () => {
    expect(messages({ type: "skill", topic: "SQL", level: "beginner", totalDays: 10, addHabit: true })).toContain("Choose a length.");
  });
});
