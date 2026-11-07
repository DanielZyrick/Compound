import { describe, expect, it } from "vitest";
import { findDuplicate, normalizeTopic } from "./duplicate";

describe("normalizeTopic", () => {
  it("ignores case, extra spaces and a trailing full stop", () => {
    expect(normalizeTopic("  Building RAG   apps.  ")).toBe("building rag apps");
  });
});

describe("findDuplicate", () => {
  const active = [
    { id: "a", topic: "Building RAG apps with Python", type: "skill" as const },
    { id: "b", topic: "Negotiating a salary", type: "thinking" as const },
  ];

  it("finds an active track on the same topic and type", () => {
    expect(findDuplicate(active, { topic: "building rag apps with  python", type: "skill" })?.id).toBe("a");
  });

  it("allows the same topic as a different type, or a different topic", () => {
    expect(findDuplicate(active, { topic: "Building RAG apps with Python", type: "thinking" })).toBeUndefined();
    expect(findDuplicate(active, { topic: "SQL for data analysis", type: "skill" })).toBeUndefined();
  });
});
