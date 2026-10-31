import { describe, expect, it } from "vitest";
import { demoPlan, planPrompt, trackPlanSchema, TRACK_LENGTHS } from "./plan";

const day = (n: number) => ({ day: n, title: `Day ${n} title`, summary: "A summary that is long enough." });

describe("trackPlanSchema", () => {
  it("accepts a plan with days numbered 1 to N", () => {
    const plan = { title: "Python basics", days: [day(1), day(2), day(3)] };
    expect(trackPlanSchema(3).safeParse(plan).success).toBe(true);
  });

  it("rejects the wrong number of days", () => {
    const plan = { title: "Python basics", days: [day(1), day(2)] };
    expect(trackPlanSchema(3).safeParse(plan).success).toBe(false);
  });

  it("rejects days out of order or with gaps", () => {
    expect(trackPlanSchema(3).safeParse({ title: "Python", days: [day(1), day(3), day(2)] }).success).toBe(false);
    expect(trackPlanSchema(3).safeParse({ title: "Python", days: [day(1), day(1), day(3)] }).success).toBe(false);
  });

  it("rejects a summary that's too short", () => {
    const plan = { title: "Python basics", days: [{ day: 1, title: "Start", summary: "Too short" }] };
    expect(trackPlanSchema(1).safeParse(plan).success).toBe(false);
  });
});

describe("demoPlan", () => {
  it.each(TRACK_LENGTHS)("passes the schema for %i days, for both track types", (totalDays) => {
    for (const type of ["skill", "thinking"] as const) {
      const plan = demoPlan({ topic: "Public speaking", type, level: "beginner", totalDays });
      expect(trackPlanSchema(totalDays).safeParse(plan).success).toBe(true);
    }
  });

  it("adds weekly reviews and ends with a recap", () => {
    const plan = demoPlan({ topic: "SQL", type: "skill", level: "beginner", totalDays: 14 });
    expect(plan.days[6].title).toBe("Week 1 review");
    expect(plan.days[13].title).toBe("Recap and mini project");
    expect(plan.title).toBe("SQL in 14 days");
  });
});

describe("planPrompt", () => {
  it("wraps the user's words in tags and includes the goal when given", () => {
    const prompt = planPrompt({ topic: "Negotiation", type: "thinking", level: "intermediate", totalDays: 7, focus: "Get a raise" });
    expect(prompt).toContain("<topic>Negotiation</topic>");
    expect(prompt).toContain("<learner>Get a raise</learner>");
    expect(prompt).toContain("exactly 7 days");
  });

  it("leaves the goal out when there isn't one", () => {
    const prompt = planPrompt({ topic: "Excel", type: "skill", level: "beginner", totalDays: 7, focus: null });
    expect(prompt).not.toContain("<learner>");
  });
});
