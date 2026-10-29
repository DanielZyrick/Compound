import { describe, expect, it } from "vitest";
import { saveNoteSchema, setNoteDoneSchema } from "./notes";

describe("saveNoteSchema", () => {
  it("trims the title and turns an empty body into null", () => {
    expect(saveNoteSchema.parse({ title: "  Call the bank  ", body: "   " })).toEqual({ title: "Call the bank", body: null });
    expect(saveNoteSchema.parse({ title: "Call the bank" })).toEqual({ title: "Call the bank", body: null });
  });

  it("keeps the body's line breaks", () => {
    expect(saveNoteSchema.parse({ title: "List", body: "eggs\nmilk" }).body).toBe("eggs\nmilk");
  });

  it("needs a title", () => {
    const result = saveNoteSchema.safeParse({ title: "   " });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("Write something first.");
  });

  it("limits the title and body length", () => {
    expect(saveNoteSchema.safeParse({ title: "a".repeat(121) }).success).toBe(false);
    expect(saveNoteSchema.safeParse({ title: "a".repeat(120) }).success).toBe(true);
    expect(saveNoteSchema.safeParse({ title: "a", body: "b".repeat(5001) }).success).toBe(false);
  });

  it("only accepts a real id when editing", () => {
    expect(saveNoteSchema.safeParse({ id: "not-a-uuid", title: "x" }).success).toBe(false);
  });
});

describe("setNoteDoneSchema", () => {
  it("needs an id and a boolean", () => {
    expect(setNoteDoneSchema.safeParse({ id: "00000000-0000-4000-8000-000000000000", done: true }).success).toBe(true);
    expect(setNoteDoneSchema.safeParse({ id: "00000000-0000-4000-8000-000000000000", done: "yes" }).success).toBe(false);
  });
});
