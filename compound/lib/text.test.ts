import { describe, expect, it } from "vitest";
import { shorten } from "./text";

describe("shorten", () => {
  it("leaves short text alone (apart from trimming)", () => {
    expect(shorten("  Read 10 pages  ", 60)).toBe("Read 10 pages");
  });

  it("cuts at a word boundary and adds an ellipsis", () => {
    const name = "Learn: Writing clear, well-structured SQL queries for data analysis in 7 days";
    const result = shorten(name, 60);
    expect(result).toBe("Learn: Writing clear, well-structured SQL queries for data…");
    expect(result.length).toBeLessThanOrEqual(60);
  });

  it("drops trailing punctuation before the ellipsis", () => {
    expect(shorten("Plan, build, ship, repeat, every single day", 20)).toBe("Plan, build, ship…");
  });

  it("cuts a single long word when there is no space", () => {
    expect(shorten("Supercalifragilisticexpialidocious", 10)).toBe("Supercali…");
  });
});
