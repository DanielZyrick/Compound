import { parseRich } from "@/lib/lessons/rich-text";
import { cn } from "@/lib/utils";
import { CodeBlock } from "./code-block";
import { InlineText } from "./inline-text";

/**
 * Text that may hold `inline code` and fenced code blocks: prose as
 * paragraphs, each fence as a coloured code block. A server component (the
 * colouring happens on the server); client components receive it as a
 * ready-made node.
 */
export function RichText({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      {parseRich(text).map((part, i) =>
        part.type === "code" ? (
          <CodeBlock
            key={i}
            block={{ language: part.language, filename: null, code: part.code, output: null, result: null }}
          />
        ) : (
          <p key={i} className="whitespace-pre-line">
            <InlineText text={part.text} />
          </p>
        ),
      )}
    </div>
  );
}
