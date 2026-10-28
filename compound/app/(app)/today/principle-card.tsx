"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { TodayPrinciple } from "@/lib/principles/queries";
import { loadPrinciple, saveReflection } from "./principle-actions";

/**
 * The principle of the day. If it's already saved, the server passes it in.
 * Otherwise the card asks for it once the page is on screen, so the AI is
 * only ever called for a real visit, never during rendering or prefetching.
 */
export function PrincipleCard({ initial }: { initial: TodayPrinciple | null }) {
  const [data, setData] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const requested = useRef(false);

  function load() {
    setError(null);
    startLoading(async () => {
      const result = await loadPrinciple();
      setData(result.principle);
      setError(result.error);
    });
  }

  useEffect(() => {
    // The ref stops a second request when React runs effects twice in development.
    if (initial || requested.current) return;
    requested.current = true;
    load();
  }, [initial]);

  return (
    <section className="rounded-2xl border p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <Lightbulb className="size-4 text-chart-3" />
          Principle of the day
        </h2>
        {data?.source === "demo" && <Badge variant="outline">Example</Badge>}
      </div>

      {data ? (
        <PrincipleBody principle={data} />
      ) : error ? (
        <div className="mt-3 text-sm">
          <p role="alert" className="text-destructive">
            {error}
          </p>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="mt-2">
            Try again
          </Button>
        </div>
      ) : (
        <div aria-busy className="mt-4 animate-pulse space-y-2">
          <div className="h-5 w-1/3 rounded bg-muted" />
          <div className="h-4 rounded bg-muted" />
          <div className="h-4 w-5/6 rounded bg-muted" />
          <span className="sr-only">Loading today&apos;s principle…</span>
        </div>
      )}
    </section>
  );
}

function PrincipleBody({ principle: data }: { principle: TodayPrinciple }) {
  const { title, principle, example, question } = data.principle;
  return (
    <div className="mt-3">
      <p className="text-lg font-semibold">{title}</p>
      <p className="mt-1 leading-relaxed">{principle}</p>
      <p className="mt-3 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Example: </span>
        {example}
      </p>
      <Reflection question={question} saved={data.reflection} />
    </div>
  );
}

function Reflection({ question, saved }: { question: string; saved: string | null }) {
  const [text, setText] = useState(saved ?? "");
  const [savedText, setSavedText] = useState(saved);
  const [editing, setEditing] = useState(saved === null);
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  function save() {
    setErrors([]);
    startTransition(async () => {
      const result = await saveReflection({ text });
      if (result.errors.length > 0) return setErrors(result.errors);
      setSavedText(text.trim());
      setEditing(false);
    });
  }

  return (
    <div className="mt-4 flex flex-col gap-2">
      <Label htmlFor="principle-reflection" className="leading-snug">
        {question}
      </Label>
      {editing ? (
        <>
          <Textarea
            id="principle-reflection"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="A few sentences is enough…"
            maxLength={2000}
            disabled={pending}
          />
          <div className="flex justify-end gap-2">
            {savedText !== null && (
              <Button variant="ghost" onClick={() => setEditing(false)} disabled={pending}>
                Cancel
              </Button>
            )}
            <Button variant="outline" onClick={save} disabled={pending || text.trim().length === 0}>
              {pending ? "Saving…" : "Save reflection"}
            </Button>
          </div>
        </>
      ) : (
        <div className="rounded-lg border p-3 text-sm">
          <p className="whitespace-pre-line">{savedText}</p>
          <button type="button" onClick={() => setEditing(true)} className="mt-2 text-primary hover:underline">
            Edit
          </button>
        </div>
      )}
      {errors.length > 0 && (
        <p role="alert" className="text-sm text-destructive">
          {errors.join(" ")}
        </p>
      )}
    </div>
  );
}
