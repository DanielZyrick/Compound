import { describe, expect, it } from "vitest";
import { describeDue, isDue } from "./due";

const TODAY = "2026-11-11"; // a Wednesday

describe("describeDue", () => {
  it("names today and tomorrow", () => {
    expect(describeDue("2026-11-11", TODAY)).toEqual({ label: "Due today", tone: "today" });
    expect(describeDue("2026-11-12", TODAY)).toEqual({ label: "Due tomorrow", tone: "upcoming" });
  });

  it("gives later dates with their weekday, and the year when it differs", () => {
    expect(describeDue("2026-11-13", TODAY)).toEqual({ label: "Due Fri, Nov 13", tone: "upcoming" });
    expect(describeDue("2027-01-04", TODAY)).toEqual({ label: "Due Mon, Jan 4, 2027", tone: "upcoming" });
  });

  it("counts the days a note is overdue", () => {
    expect(describeDue("2026-11-10", TODAY)).toEqual({ label: "Overdue · 1 day", tone: "overdue" });
    expect(describeDue("2026-10-31", TODAY)).toEqual({ label: "Overdue · 11 days", tone: "overdue" });
  });

  it("only says when a finished note was due", () => {
    expect(describeDue("2026-11-01", TODAY, true)).toEqual({ label: "Was due Nov 1", tone: "done" });
    expect(describeDue("2026-11-20", TODAY, true)).toEqual({ label: "Was due Nov 20", tone: "done" });
  });
});

describe("isDue", () => {
  it("is true for today and earlier, false for later or no date", () => {
    expect(isDue("2026-11-11", TODAY)).toBe(true);
    expect(isDue("2026-11-01", TODAY)).toBe(true);
    expect(isDue("2026-11-12", TODAY)).toBe(false);
    expect(isDue(null, TODAY)).toBe(false);
  });
});
