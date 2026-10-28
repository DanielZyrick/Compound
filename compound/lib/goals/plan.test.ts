import { describe, expect, it } from "vitest";
import { deadlineError, newGoalSchema } from "@/lib/validation/goals";
import { demoGoalPlan, goalPlanSchema, goalPrompt } from "./plan";

describe("goalPlanSchema", () => {
  it("accepts the demo plan", () => {
    expect(goalPlanSchema.safeParse(demoGoalPlan("Launch my portfolio site.")).success).toBe(true);
  });

  it("rejects a plan with one milestone or a guide without exactly 3 first steps", () => {
    const plan = demoGoalPlan("Run a 5K");
    expect(goalPlanSchema.safeParse({ ...plan, milestones: plan.milestones.slice(0, 1) }).success).toBe(false);
    expect(
      goalPlanSchema.safeParse({ ...plan, guide: { ...plan.guide, firstSteps: plan.guide.firstSteps.slice(0, 2) } }).success,
    ).toBe(false);
  });

  it("rejects an effort weight outside 1–5", () => {
    const plan = demoGoalPlan("Run a 5K");
    const milestones = [{ ...plan.milestones[0], weight: 9 }, ...plan.milestones.slice(1)];
    expect(goalPlanSchema.safeParse({ ...plan, milestones }).success).toBe(false);
  });
});

describe("goalPrompt", () => {
  it("wraps the user's words in tags and states the working days", () => {
    const prompt = goalPrompt({ title: "Run a 5K", why: "To feel healthy", days: 40, focus: null });
    expect(prompt).toContain("<goal>Run a 5K</goal>");
    expect(prompt).toContain("<why>To feel healthy</why>");
    expect(prompt).toContain("40 days");
    expect(prompt).not.toContain("<focus>");
  });
});

describe("newGoalSchema", () => {
  const valid = { title: "Run a 5K", why: "I want to feel strong again.", deadline: "2026-12-15", bufferPercent: 15 };

  it("accepts a valid goal", () => {
    expect(newGoalSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a bad date or a buffer that isn't offered", () => {
    expect(newGoalSchema.safeParse({ ...valid, deadline: "15/12/2026" }).success).toBe(false);
    expect(newGoalSchema.safeParse({ ...valid, bufferPercent: 12 }).success).toBe(false);
  });
});

describe("deadlineError", () => {
  it("needs at least 3 days and at most two years", () => {
    expect(deadlineError("2026-10-28", "2026-10-30")).toMatch(/at least 3 days/);
    expect(deadlineError("2026-10-28", "2026-10-31")).toBeNull();
    expect(deadlineError("2026-10-28", "2029-01-01")).toMatch(/two years/);
  });
});
