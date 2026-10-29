import { describe, expect, it } from "vitest";
import { firstName, greetingFor, hourIn } from "./greeting";

describe("hourIn", () => {
  it("reads the hour in the given timezone", () => {
    const now = new Date("2026-10-29T10:30:00Z");
    expect(hourIn("UTC", now)).toBe(10);
    expect(hourIn("Asia/Manila", now)).toBe(18); // UTC+8
    expect(hourIn("America/New_York", now)).toBe(6); // UTC-4 in October
  });

  it("returns 0 at midnight, not 24", () => {
    expect(hourIn("UTC", new Date("2026-10-29T00:15:00Z"))).toBe(0);
  });
});

describe("greetingFor", () => {
  it("changes at 5 am, noon and 6 pm", () => {
    expect(greetingFor(4)).toBe("Good evening");
    expect(greetingFor(5)).toBe("Good morning");
    expect(greetingFor(11)).toBe("Good morning");
    expect(greetingFor(12)).toBe("Good afternoon");
    expect(greetingFor(17)).toBe("Good afternoon");
    expect(greetingFor(18)).toBe("Good evening");
    expect(greetingFor(0)).toBe("Good evening");
  });
});

describe("firstName", () => {
  it("takes the first word of a name", () => {
    expect(firstName("Alex Reyes")).toBe("Alex");
    expect(firstName("  Daniel  Zyrick ")).toBe("Daniel");
  });

  it("is null without a name", () => {
    expect(firstName(null)).toBeNull();
    expect(firstName("   ")).toBeNull();
  });
});
