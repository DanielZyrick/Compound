import { describe, expect, it } from "vitest";
import { profileSchema } from "@/lib/validation/profile";
import { isProfileEmpty, learnerContext } from "./context";

const empty = { role: null, improve: null, skills: null, interests: null, daily_minutes: null };

describe("learnerContext", () => {
  it("is null when there's nothing to say", () => {
    expect(learnerContext([], null)).toBeNull();
    expect(learnerContext([], empty)).toBeNull();
  });

  it("lists focus areas, with or without a description", () => {
    const text = learnerContext(
      [
        { goal: "career", custom_label: null, description: "Become a senior developer." },
        { goal: "custom", custom_label: "Guitar", description: null },
      ],
      null,
    );
    expect(text).toBe("Focus (Career): Become a senior developer.\nFocus: Guitar");
  });

  it("adds only the profile answers that were given", () => {
    const text = learnerContext([], { ...empty, role: "Junior web developer", daily_minutes: 20 });
    expect(text).toBe("What they do: Junior web developer\nTime for learning: about 20 minutes a day");
  });

  it("includes every answer when all are given", () => {
    const text = learnerContext([], {
      role: "Student",
      improve: "Public speaking",
      skills: "HTML, CSS",
      interests: "Running",
      daily_minutes: 30,
    })!;
    for (const part of ["Student", "Public speaking", "HTML, CSS", "Running", "30 minutes"]) {
      expect(text).toContain(part);
    }
  });
});

describe("isProfileEmpty", () => {
  it("is true with no profile or no answers", () => {
    expect(isProfileEmpty(null)).toBe(true);
    expect(isProfileEmpty(empty)).toBe(true);
  });

  it("is false once anything is answered", () => {
    expect(isProfileEmpty({ ...empty, interests: "Chess" })).toBe(false);
    expect(isProfileEmpty({ ...empty, daily_minutes: 10 })).toBe(false);
  });
});

describe("profileSchema", () => {
  it("trims answers and saves empty ones as null", () => {
    const parsed = profileSchema.parse({ role: "  Nurse  ", improve: "", dailyMinutes: 20 });
    expect(parsed).toEqual({ role: "Nurse", improve: null, skills: null, interests: null, dailyMinutes: 20 });
  });

  it("accepts an empty form", () => {
    expect(profileSchema.parse({})).toEqual({ role: null, improve: null, skills: null, interests: null, dailyMinutes: null });
  });

  it("rejects long answers and odd time choices", () => {
    expect(profileSchema.safeParse({ role: "x".repeat(121) }).success).toBe(false);
    expect(profileSchema.safeParse({ dailyMinutes: 45 }).success).toBe(false);
  });
});
