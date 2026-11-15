"use client";

import { useRef } from "react";
import { type CodeEdit, indentEdit, indentUnit, newlineEdit } from "@/lib/lessons/code-editing";
import { languageName } from "@/lib/lessons/code";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  language: string;
  disabled?: boolean;
  maxLength?: number;
  className?: string;
};

/**
 * A box for typing code: the same dark panel as the lesson's code blocks,
 * where Tab indents and Enter keeps the indentation. Still a plain textarea
 * underneath, so it works with every keyboard, phone and screen reader.
 *
 * Tab would trap keyboard users inside the box, so Escape lets the next Tab
 * leave it (the note under the box says so).
 */
export function CodeInput({ id, value, onChange, language, disabled, maxLength, className }: Props) {
  const escaped = useRef(false);
  const unit = indentUnit(language);
  const hintId = `${id}-keys`;

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Leave the keys alone while an input method (e.g. for Japanese) is composing.
    if (event.nativeEvent.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
    const box = event.currentTarget;

    if (event.key === "Escape") {
      escaped.current = true;
      return;
    }
    if (event.key === "Tab") {
      if (escaped.current) return; // Esc then Tab: move on to the next control
      event.preventDefault();
      const edit = indentEdit(box.value, box.selectionStart, box.selectionEnd, unit, event.shiftKey);
      if (edit) applyEdit(box, edit, onChange);
      return;
    }
    escaped.current = false;
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const edit = newlineEdit(box.value, box.selectionStart, box.selectionEnd, unit);
      if (maxLength === undefined || box.value.length - (edit.to - edit.from) + edit.insert.length <= maxLength) {
        applyEdit(box, edit, onChange);
      }
    }
  }

  return (
    <div className={cn("min-w-0", className)}>
      <div className="overflow-hidden rounded-xl border border-foreground/15 shadow-card focus-within:ring-2 focus-within:ring-ring/50">
        <div className="flex items-center justify-between gap-3 bg-[#262521] px-4 py-2">
          <span className="font-mono text-xs text-white/70">{languageName(language)}</span>
          <span className="text-xs text-white/45">Your answer</span>
        </div>
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => (escaped.current = false)}
          disabled={disabled}
          maxLength={maxLength}
          placeholder="Type your code…"
          aria-describedby={hintId}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          // Long lines scroll sideways, as they do in the lesson's code blocks.
          wrap="off"
          style={{ tabSize: unit.length }}
          className="block field-sizing-content max-h-96 min-h-32 w-full resize-y overflow-auto bg-[#1b1a17] p-4 font-mono text-[13px] leading-relaxed text-[#e6edf3] caret-white outline-none placeholder:text-white/35 disabled:opacity-60"
        />
      </div>
      {/* Only useful with a keyboard, so it's hidden on touch screens. */}
      <p id={hintId}className="mt-1.5 text-xs text-muted-foreground [@media(pointer:coarse)]:hidden">
        Tab indents. To leave the box with the keyboard, press Esc, then Tab.
      </p>
    </div>
  );
}

/**
 * Makes the edit the way typing would, so the browser's undo (Ctrl+Z) still
 * works. Where that isn't supported, the text is replaced directly.
 */
function applyEdit(box: HTMLTextAreaElement, edit: CodeEdit, onChange: (value: string) => void) {
  box.setSelectionRange(edit.from, edit.to);
  const typed =
    edit.insert === ""
      ? document.execCommand("delete")
      : document.execCommand("insertText", false, edit.insert);
  if (!typed) {
    box.setRangeText(edit.insert, edit.from, edit.to, "end");
    onChange(box.value);
  }
  box.setSelectionRange(edit.selectionStart, edit.selectionEnd);
}
