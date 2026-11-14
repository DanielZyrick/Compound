// The little bit of formatting lesson text may carry: `inline code` inside a
// sentence, and fenced blocks of code (three backticks, an optional language,
// then the code). Nothing else is formatting, and no HTML is ever read from
// the text. Pure, so it's easy to test.

export type InlinePart = { type: "text" | "code"; text: string };

export type RichPart = { type: "text"; text: string } | { type: "code"; language: string; code: string };

/**
 * Splits a sentence into plain text and `code` spans. A backtick without a
 * partner, and an empty pair, stay as ordinary characters.
 */
export function parseInline(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  let plain = "";
  let i = 0;
  while (i < text.length) {
    const close = text[i] === "`" ? text.indexOf("`", i + 1) : -1;
    const code = close === -1 ? "" : text.slice(i + 1, close);
    // Code never runs over a line break: that's a stray backtick, not a span.
    if (close !== -1 && code.trim() !== "" && !code.includes("\n")) {
      if (plain) parts.push({ type: "text", text: plain });
      plain = "";
      parts.push({ type: "code", text: code });
      i = close + 1;
    } else {
      plain += text[i];
      i += 1;
    }
  }
  if (plain) parts.push({ type: "text", text: plain });
  return parts;
}

const FENCE = /```([\w+#.-]*)[ \t]*\r?\n([\s\S]*?)\r?\n?[ \t]*```/g;

/** Splits text into paragraphs of prose and fenced code blocks, in order. */
export function parseRich(text: string): RichPart[] {
  const parts: RichPart[] = [];
  const addText = (chunk: string) => {
    const trimmed = chunk.trim();
    if (trimmed) parts.push({ type: "text", text: trimmed });
  };
  let last = 0;
  for (const match of text.matchAll(FENCE)) {
    addText(text.slice(last, match.index));
    const code = match[2].replace(/\s+$/, "");
    if (code.trim()) parts.push({ type: "code", language: match[1].toLowerCase() || "text", code });
    last = match.index + match[0].length;
  }
  addText(text.slice(last));
  return parts;
}

/** The text without its backticks and fences, for labels read by screen readers. */
export function plainText(text: string): string {
  return parseRich(text)
    .map((part) => (part.type === "code" ? part.code : parseInline(part.text).map((p) => p.text).join("")))
    .join("\n");
}
