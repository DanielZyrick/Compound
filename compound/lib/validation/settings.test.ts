import { describe, expect, it } from "vitest";
import { deleteAccountSchema, displayNameSchema, timezoneSettingSchema } from "./settings";

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

describe("deleteAccountSchema", () => {
  it("accepts the word delete, in any case and with spaces around it", () => {
    expect(deleteAccountSchema.safeParse({ confirm: "delete" }).success).toBe(true);
    expect(deleteAccountSchema.safeParse({ confirm: "  DELETE " }).success).toBe(true);
  });

  it("refuses anything else, with a message that says what to type", () => {
    for (const confirm of ["", "delet", "yes", "delete my account"]) {
      const result = deleteAccountSchema.safeParse({ confirm });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe('Type "delete" to confirm.');
    }
    expect(deleteAccountSchema.safeParse({}).success).toBe(false);
  });
});
