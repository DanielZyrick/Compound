import { describe, expect, it } from "vitest";
import { answerLanguage, indentEdit, indentUnit, newlineEdit, type CodeEdit } from "./code-editing";

/** The text after an edit, with the selection marked by | characters. */
function apply(value: string, edit: CodeEdit | null): string {
  if (!edit) return "(no change)";
  const text = value.slice(0, edit.from) + edit.insert + value.slice(edit.to);
  const { selectionStart: a, selectionEnd: b } = edit;
  return a === b ? text.slice(0, a) + "|" + text.slice(a) : text.slice(0, a) + "|" + text.slice(a, b) + "|" + text.slice(b);
}

describe("answerLanguage", () => {
  const fence = "```";

  it("is the language of a fenced sample answer", () => {
    expect(answerLanguage(`${fence}python\nprint(len(name))\n${fence}`)).toBe("python");
    expect(answerLanguage(`One line is enough:\n${fence}SQL\nSELECT 1;\n${fence}`)).toBe("sql");
    expect(answerLanguage(`${fence}\nls -la\n${fence}`)).toBe("text");
  });

  it("is null for a prose answer, even one that names code", () => {
    expect(answerLanguage("Because `len` counts the characters.")).toBeNull();
    expect(answerLanguage("I'd ask what result they want in a month.")).toBeNull();
  });
});

describe("indentUnit", () => {
  it("is four spaces in Python and two elsewhere", () => {
    expect(indentUnit("python")).toBe("    ");
    expect(indentUnit(" PY ")).toBe("    ");
    expect(indentUnit("javascript")).toBe("  ");
    expect(indentUnit("sql")).toBe("  ");
  });
});

describe("indentEdit", () => {
  it("adds one level at the caret when nothing is selected", () => {
    expect(apply("ab", indentEdit("ab", 1, 1, "  ", false))).toBe("a  |b");
  });

  it("indents every selected line, and keeps them selected", () => {
    const value = "a\nb\nc";
    // "a\nb" selected: both lines move, c stays.
    expect(apply(value, indentEdit(value, 0, 3, "  ", false))).toBe("  |a\n  b|\nc");
  });

  it("leaves out a line the selection only touches at its start, and blank lines", () => {
    const value = "a\n\nb\nc";
    // Selected "a\n\nb\n": the caret sits at the start of c, which doesn't move.
    expect(apply(value, indentEdit(value, 0, 5, "  ", false))).toBe("  |a\n\n  b\n|c");
  });

  it("outdents by up to one level, or one tab", () => {
    expect(apply("    x", indentEdit("    x", 5, 5, "  ", true))).toBe("  x|");
    expect(apply(" x", indentEdit(" x", 2, 2, "  ", true))).toBe("x|");
    expect(apply("\tx", indentEdit("\tx", 2, 2, "  ", true))).toBe("x|");
    const value = "  a\n    b";
    expect(apply(value, indentEdit(value, 0, value.length, "  ", true))).toBe("|a\n  b|");
  });

  it("never moves the caret before the start of its line", () => {
    // The caret is inside the indentation that is being removed.
    expect(apply("a\n    b", indentEdit("a\n    b", 3, 3, "    ", true))).toBe("a\n|b");
  });

  it("changes nothing when the lines have no indentation to remove", () => {
    expect(indentEdit("a\nb", 0, 3, "  ", true)).toBeNull();
  });
});

describe("newlineEdit", () => {
  it("keeps the current line's indentation", () => {
    expect(apply("  x = 1", newlineEdit("  x = 1", 7, 7, "  "))).toBe("  x = 1\n  |");
    expect(apply("x", newlineEdit("x", 1, 1, "  "))).toBe("x\n|");
  });

  it("adds a level after a line that opens a block", () => {
    expect(apply("for x in xs:", newlineEdit("for x in xs:", 12, 12, "    "))).toBe("for x in xs:\n    |");
    expect(apply("  if (a) { ", newlineEdit("  if (a) { ", 11, 11, "  "))).toBe("  if (a) { \n    |");
  });

  it("looks only at the text before the caret, and replaces a selection", () => {
    // Caret in the middle: "f(" is before it, so the rest moves to an indented line.
    expect(apply("f(a)", newlineEdit("f(a)", 2, 2, "  "))).toBe("f(\n  |a)");
    expect(apply("abc", newlineEdit("abc", 1, 2, "  "))).toBe("a\n|c");
  });
});
