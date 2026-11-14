import { bundledLanguages, codeToHtml } from "shiki";
import { codeBlockTitle, languageName } from "@/lib/lessons/code";
import type { CodeBlockContent } from "@/lib/lessons/schema";
import { cn } from "@/lib/utils";
import { CopyButton } from "./copy-button";

/**
 * A code example the way documentation shows it: a dark panel with the file
 * name or language on top, a copy button, coloured syntax, and under it what
 * the code prints ("Expected output") or does ("Result").
 *
 * A server component: Shiki colours the code on the server, so the browser
 * gets plain HTML and no highlighting script.
 */
export async function CodeBlock({ block, className }: { block: CodeBlockContent; className?: string }) {
  const language = block.language.trim().toLowerCase();
  const title = codeBlockTitle(block);
  const html = await highlight(block.code, language);

  return (
    <figure className={cn("min-w-0 overflow-hidden rounded-xl border border-foreground/15 shadow-card", className)}>
      <div className="flex items-center justify-between gap-3 bg-[#262521] py-1.5 pr-1.5 pl-4">
        <figcaption className="truncate font-mono text-xs text-white/70">{title}</figcaption>
        <div className="flex shrink-0 items-center gap-2">
          {block.filename && <span className="text-xs text-white/45">{languageName(language)}</span>}
          <CopyButton text={block.code} label={`Copy ${title}`} />
        </div>
      </div>
      {/* Long lines scroll inside the block, so they never widen the page. */}
      <div
        className="overflow-x-auto bg-[#1b1a17] p-4 text-[13px] leading-relaxed [&_pre]:!bg-transparent [&_pre]:outline-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {block.output !== null ? (
        <div className="border-t border-foreground/15 bg-muted px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground">Expected output</p>
          <pre className="mt-1.5 overflow-x-auto font-mono text-[13px] leading-relaxed">
            <samp>{block.output}</samp>
          </pre>
        </div>
      ) : block.result ? (
        <div className="border-t border-foreground/15 bg-muted px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground">Result</p>
          <p className="mt-1 text-sm">{block.result}</p>
        </div>
      ) : null}
    </figure>
  );
}

/** Coloured HTML for the code. A language Shiki doesn't know is shown without colours. */
async function highlight(code: string, language: string): Promise<string> {
  const lang = language in bundledLanguages ? language : "text";
  try {
    // Shiki escapes the code itself, so the HTML is safe to insert.
    return await codeToHtml(code, { lang, theme: "github-dark-default" });
  } catch {
    return codeToHtml(code, { lang: "text", theme: "github-dark-default" });
  }
}
