import { describe, expect, it } from "vitest";
import { DEMO_PRINCIPLES, demoPrinciple, principlePrompt, principleSchema } from "./principle";

describe("principleSchema", () => {
  it("accepts every demo principle", () => {
    for (const principle of DEMO_PRINCIPLES) {
      expect(principleSchema.safeParse(principle).success).toBe(true);
    }
  });

  it("rejects a principle without an example", () => {
    const withoutExample = { ...DEMO_PRINCIPLES[0], example: undefined };
    expect(principleSchema.safeParse(withoutExample).success).toBe(false);
  });
});

describe("demoPrinciple", () => {
  it("gives the same principle all day and a different one the next day", () => {
    expect(demoPrinciple("2026-10-28")).toBe(demoPrinciple("2026-10-28"));
    expect(demoPrinciple("2026-10-29")).not.toBe(demoPrinciple("2026-10-28"));
  });

  it("works for dates before the reference date", () => {
    expect(DEMO_PRINCIPLES).toContain(demoPrinciple("2025-06-01"));
  });
});

describe("principlePrompt", () => {
  it("includes the focus and recent principles in tags", () => {
    const prompt = principlePrompt({ focus: "Grow my bakery", recent: ["Inversion", "Compounding"] });
    expect(prompt).toContain("<focus>Grow my bakery</focus>");
    expect(prompt).toContain("<recent>Inversion; Compounding</recent>");
  });

  it("leaves out empty parts", () => {
    const prompt = principlePrompt({ focus: null, recent: [] });
    expect(prompt).not.toContain("<focus>");
    expect(prompt).not.toContain("<recent>");
  });
});
