import { describe, expect, it } from "vitest";
import { bibleGatewayUrl, findReadingPlan, READING_PLANS, REFLECTION_PROMPTS, reflectionPrompt } from "./plans";

describe("READING_PLANS", () => {
  it("has unique ids", () => {
    const ids = READING_PLANS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(READING_PLANS.map((p) => [p.id, p] as const))("%s: days are numbered 1..N with one passage each", (_, plan) => {
    plan.days.forEach((d, i) => {
      expect(d.day).toBe(i + 1);
      expect(d.passage).toMatch(/^[1-3]?\s?[A-Z][a-z]+ \d+$/); // e.g. "John 3", "Psalm 23"
    });
  });

  it("has the expected lengths", () => {
    expect(findReadingPlan("john-21")?.days).toHaveLength(21);
    expect(findReadingPlan("proverbs-31")?.days).toHaveLength(31);
    expect(findReadingPlan("psalms-30")?.days).toHaveLength(30);
  });

  it("finds nothing for an unknown id", () => {
    expect(findReadingPlan("genesis-50")).toBeUndefined();
    expect(findReadingPlan(null)).toBeUndefined();
  });
});

describe("bibleGatewayUrl", () => {
  it("links to the passage in the default translation", () => {
    expect(bibleGatewayUrl("John 3")).toBe("https://www.biblegateway.com/passage/?search=John+3&version=NIV");
  });

  it("encodes the passage and accepts another version", () => {
    expect(bibleGatewayUrl("1 John 4", "ESV")).toBe("https://www.biblegateway.com/passage/?search=1+John+4&version=ESV");
  });
});

describe("reflectionPrompt", () => {
  it("cycles through the prompts by day", () => {
    expect(reflectionPrompt(1)).toBe(REFLECTION_PROMPTS[0]);
    expect(reflectionPrompt(REFLECTION_PROMPTS.length + 1)).toBe(REFLECTION_PROMPTS[0]);
    expect(reflectionPrompt(2)).toBe(REFLECTION_PROMPTS[1]);
  });
});
