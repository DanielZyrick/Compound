import { describe, expect, it } from "vitest";
import { NOTE_COLORS, NOTE_PAPER, tiltFor } from "./colors";

describe("tiltFor", () => {
  it("gives the same note the same tilt every time", () => {
    const id = "6f1c2a3b-0000-4000-8000-000000000001";
    expect(tiltFor(id)).toBe(tiltFor(id));
  });

  it("varies between notes", () => {
    const tilts = new Set(Array.from({ length: 20 }, (_, i) => tiltFor(`note-${i}`)));
    expect(tilts.size).toBeGreaterThan(1);
  });
});

describe("NOTE_PAPER", () => {
  it("has paper for every colour", () => {
    for (const color of NOTE_COLORS) expect(NOTE_PAPER[color].paper).toBeTruthy();
  });
});
