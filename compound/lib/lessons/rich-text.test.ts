import { describe, expect, it } from "vitest";
import { parseInline, parseRich, plainText } from "./rich-text";

const text = (t: string) => ({ type: "text", text: t });
const code = (t: string) => ({ type: "code", text: t });

describe("parseInline", () => {
  it("leaves plain text alone", () => {
    expect(parseInline("Just a sentence.")).toEqual([text("Just a sentence.")]);
    expect(parseInline("")).toEqual([]);
  });

  it("finds code spans anywhere in a sentence", () => {
    expect(parseInline("Call `useState` first.")).toEqual([text("Call "), code("useState"), text(" first.")]);
    expect(parseInline("`git status` shows changes")).toEqual([code("git status"), text(" shows changes")]);
    expect(parseInline("Run `npm test`")).toEqual([text("Run "), code("npm test")]);
    expect(parseInline("`a` and `b`")).toEqual([code("a"), text(" and "), code("b")]);
  });

  it("keeps a backtick without a partner as an ordinary character", () => {
    expect(parseInline("A stray ` here")).toEqual([text("A stray ` here")]);
    expect(parseInline("`open` and a stray `")).toEqual([code("open"), text(" and a stray `")]);
  });

  it("doesn't treat an empty pair, or a pair across lines, as code", () => {
    expect(parseInline("Empty `` pair")).toEqual([text("Empty `` pair")]);
    expect(parseInline("one ` line\nnext ` line")).toEqual([text("one ` line\nnext ` line")]);
  });

  it("never reads HTML: tags are just text", () => {
    expect(parseInline("<b>bold</b> and `<div>`")).toEqual([text("<b>bold</b> and "), code("<div>")]);
  });
});

describe("parseRich", () => {
  it("returns prose as one part", () => {
    expect(parseRich("First line.\nSecond line.")).toEqual([{ type: "text", text: "First line.\nSecond line." }]);
  });

  it("splits out a fenced block with its language", () => {
    expect(parseRich("Use a loop:\n```python\nfor n in [1, 2]:\n    print(n)\n```\nThat prints both.")).toEqual([
      { type: "text", text: "Use a loop:" },
      { type: "code", language: "python", code: "for n in [1, 2]:\n    print(n)" },
      { type: "text", text: "That prints both." },
    ]);
  });

  it("calls a block without a language text, and keeps indentation", () => {
    expect(parseRich("```\n  indented\n```")).toEqual([{ type: "code", language: "text", code: "  indented" }]);
  });

  it("handles several blocks and drops empty ones", () => {
    const parts = parseRich("```js\na()\n```\n```\n\n```\n```sql\nSELECT 1;\n```");
    expect(parts).toEqual([
      { type: "code", language: "js", code: "a()" },
      { type: "code", language: "sql", code: "SELECT 1;" },
    ]);
  });

  it("leaves an unfinished fence as text", () => {
    expect(parseRich("```python\nprint(1)")).toEqual([{ type: "text", text: "```python\nprint(1)" }]);
  });
});

describe("plainText", () => {
  it("removes backticks and fences, keeping the words and code", () => {
    expect(plainText("What does `len(x)` return?")).toBe("What does len(x) return?");
    expect(plainText("Try:\n```python\nprint(1)\n```")).toBe("Try:\nprint(1)");
  });
});
