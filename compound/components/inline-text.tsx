import { parseInline } from "@/lib/lessons/rich-text";

/**
 * A sentence with its `inline code` shown as small code chips. Works in server
 * and client components; everything is rendered as text, never as HTML.
 */
export function InlineText({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((part, i) =>
        part.type === "code" ? (
          <code
            key={i}
            className="rounded-[5px] border border-foreground/10 bg-foreground/[0.06] px-1 py-px font-mono text-[0.875em] break-words"
          >
            {part.text}
          </code>
        ) : (
          part.text
        ),
      )}
    </>
  );
}
