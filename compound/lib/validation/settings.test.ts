import { describe, expect, it } from "vitest";
import { displayNameSchema, timezoneSettingSchema } from "./settings";

describe("displayNameSchema", () => {
  it("trims the name", () => {
    expect(displayNameSchema.parse({ name: "  Dan  " })).toEqual({ name: "Dan" });
  });

  it("rejects an empty or too long name", () => {
    expect(displayNameSchema.safeParse({ name: "   " }).success).toBe(false);
    expect(displayNameSchema.safeParse({ name: "x".repeat(61) }).success).toBe(false);
  });
});

describe("timezoneSettingSchema", () => {
  it("accepts a real timezone and rejects a made-up one", () => {
    expect(timezoneSettingSchema.safeParse({ timezone: "Asia/Manila" }).success).toBe(true);
    expect(timezoneSettingSchema.safeParse({ timezone: "Mars/Olympus" }).success).toBe(false);
  });
});
