import { describe, expect, it } from "vitest";
import { currentTrackDay } from "./progress";

describe("currentTrackDay", () => {
  it("is day 1 on the start date", () => {
    expect(currentTrackDay("2026-10-27", "2026-10-27", 7)).toBe(1);
  });

  it("moves on one day per calendar day", () => {
    expect(currentTrackDay("2026-10-27", "2026-10-30", 7)).toBe(4);
  });

  it("stops at the last day", () => {
    expect(currentTrackDay("2026-10-01", "2026-10-27", 7)).toBe(7);
  });

  it("never goes below day 1", () => {
    expect(currentTrackDay("2026-10-28", "2026-10-27", 7)).toBe(1);
  });
});
