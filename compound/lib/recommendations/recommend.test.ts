import { describe, expect, it } from "vitest";
import { demoRecommendations, needsRecommendations, recommendationsSchema, recommendPrompt } from "./recommend";

describe("recommendationsSchema", () => {
  it("accepts the demo suggestions", () => {
    expect(recommendationsSchema.safeParse(demoRecommendations()).success).toBe(true);
  });

  it("needs exactly three ideas with a valid length", () => {
    const [first] = demoRecommendations().tracks;
    expect(recommendationsSchema.safeParse({ tracks: [first, first] }).success).toBe(false);
    expect(recommendationsSchema.safeParse({ tracks: [first, first, { ...first, totalDays: 10 }] }).success).toBe(false);
    expect(recommendationsSchema.safeParse({ tracks: [first, first, { ...first, type: "reading" }] }).success).toBe(false);
  });
});

describe("demoRecommendations", () => {
  it("gives three different ideas", () => {
    const topics = demoRecommendations().tracks.map((t) => t.topic);
    expect(new Set(topics).size).toBe(3);
  });

  it("swaps in something new when asked to avoid the current ones", () => {
    const first = demoRecommendations().tracks.map((t) => t.topic);
    const next = demoRecommendations(first).tracks.map((t) => t.topic);
    expect(next).not.toEqual(first);
    expect(next).toHaveLength(3);
  });
});

describe("needsRecommendations", () => {
  const updated = new Date("2026-10-31T10:00:00Z");

  it("is true when none were made yet", () => {
    expect(needsRecommendations({ updated_at: updated, recommended_at: null })).toBe(true);
  });

  it("is true when the profile changed since", () => {
    expect(needsRecommendations({ updated_at: updated, recommended_at: new Date("2026-10-31T09:00:00Z") })).toBe(true);
  });

  it("is false when they're newer than the profile", () => {
    expect(needsRecommendations({ updated_at: updated, recommended_at: new Date("2026-10-31T11:00:00Z") })).toBe(false);
  });
});

describe("recommendPrompt", () => {
  it("wraps the learner, current tracks and earlier ideas in tags", () => {
    const prompt = recommendPrompt({ learner: "What they do: Nurse", current: ["Excel"], avoid: ["Public speaking"] });
    expect(prompt).toContain("<learner>What they do: Nurse</learner>");
    expect(prompt).toContain("<current>Excel</current>");
    expect(prompt).toContain("<avoid>Public speaking</avoid>");
  });

  it("leaves out empty lists", () => {
    const prompt = recommendPrompt({ learner: "Interests: Chess", current: [], avoid: [] });
    expect(prompt).not.toContain("<current>");
    expect(prompt).not.toContain("<avoid>");
  });
});
