import { parseRich } from "./rich-text";

// What the code answer box does when you press Tab or Enter. Each function
// looks at the text and the selection and returns one edit to make, so the
// rules can be tested without a browser.

/** Replace value[from, to) with `insert`, then select [selectionStart, selectionEnd). */
export type CodeEdit = { from: number; to: number; insert: string; selectionStart: number; selectionEnd: number };

/**
 * The language an open exercise's answer is written in, or null when the
 * answer is prose. Lessons write a code sample answer as a fenced block, so
 * that is the sign; only the language is ever sent to the browser.
 */
export function answerLanguage(sampleAnswer: string): string | null {
  const block = parseRich(sampleAnswer).find((part) => part.type === "code");
  return block?.type === "code" ? block.language : null;
}

/** One level of indentation: four spaces in Python, two elsewhere. */
export function indentUnit(language: string): string {
  return /^(py|python)$/i.test(language.trim()) ? "    " : "  ";
}

/**
 * Tab and Shift+Tab. With no selection, Tab adds one level at the caret.
 * Otherwise every selected line moves one level in or out. Null when
 * there is nothing to change (Shift+Tab on lines that aren't indented).
 */
export function indentEdit(value: string, start: number, end: number, unit: string, outdent: boolean): CodeEdit | null {
  if (start === end && !outdent) {
    return { from: start, to: start, insert: unit, selectionStart: start + unit.length, selectionEnd: start + unit.length };
  }
  const from = value.lastIndexOf("\n", start - 1) + 1;
  // A selection that ends at the very start of a line doesn't include that line.
  const lastChar = end > start && value[end - 1] === "\n" ? end - 1 : end;
  const nextBreak = value.indexOf("\n", lastChar);
  const to = nextBreak === -1 ? value.length : nextBreak;

  const lines = value.slice(from, to).split("\n");
  const changed = lines.map((line) => {
    if (!outdent) return line.trim() === "" ? line : unit + line;
    if (line.startsWith("\t")) return line.slice(1);
    const spaces = line.length - line.trimStart().length;
    return line.slice(Math.min(spaces, unit.length));
  });
  const insert = changed.join("\n");
  if (insert === value.slice(from, to)) return null;

  const firstDelta = changed[0].length - lines[0].length;
  const totalDelta = insert.length - (to - from);
  return {
    from,
    to,
    insert,
    selectionStart: Math.max(from, start + firstDelta),
    selectionEnd: Math.max(from, end + totalDelta),
  };
}

/**
 * Enter: the new line starts with the same indentation as the current one,
 * and one level more after a line that opens a block (ends in `:`, `{`, `[` or `(`).
 */
export function newlineEdit(value: string, start: number, end: number, unit: string): CodeEdit {
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const before = value.slice(lineStart, start);
  const indent = before.match(/^[ \t]*/)?.[0] ?? "";
  const opens = /[:{[(]$/.test(before.trimEnd());
  const insert = "\n" + indent + (opens ? unit : "");
  const caret = start + insert.length;
  return { from: start, to: end, insert, selectionStart: caret, selectionEnd: caret };
}
