import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { z } from "zod";
import { CodeBlock } from "@/components/code-block";
import { InlineText } from "@/components/inline-text";
import { RichText } from "@/components/rich-text";
import { Badge } from "@/components/ui/badge";
import { requireOnboardedUser } from "@/lib/auth/dal";
import { answerLanguage } from "@/lib/lessons/code-editing";
import { mistakesToReview, type Mistake } from "@/lib/mistakes/collect";
import { getTrackMistakes } from "@/lib/mistakes/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Mistakes to review" };

const FILTERS = [
  { value: "review", label: "To review" },
  { value: "all", label: "All" },
] as const;

export default function MistakesPage({ params, searchParams }: PageProps<"/tracks/[id]/mistakes">) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-8 md:py-10">
      <Suspense fallback={<div aria-hidden className="mt-6 h-96 animate-pulse rounded-2xl bg-muted" />}>
        <Mistakes params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Mistakes({ params, searchParams }: Pick<PageProps<"/tracks/[id]/mistakes">, "params" | "searchParams">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const user = await requireOnboardedUser();
  const result = await getTrackMistakes(user.id, id);
  if (!result) notFound();
  const { track, mistakes } = result;

  const filter = (await searchParams).show === "all" ? "all" : "review";
  const toReview = mistakesToReview(mistakes);
  const shown = filter === "all" ? mistakes : toReview;

  return (
    <>
      <Link
        href={`/tracks/${track.id}`}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {track.title}
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Mistakes to review</h1>
      <p className="mt-1 text-muted-foreground">
        Questions you got wrong the first time, with the right answer and why. Going over them is one of the fastest
        ways to learn.
      </p>

      <nav aria-label="Show" className="mt-6 flex gap-1">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value === "review" ? `/tracks/${track.id}/mistakes` : `/tracks/${track.id}/mistakes?show=all`}
            aria-current={f.value === filter ? "page" : undefined}
            className={cn(
              "rounded-full px-3 py-1 text-sm tabular-nums",
              f.value === filter ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {f.label} ({f.value === "all" ? mistakes.length : toReview.length})
          </Link>
        ))}
      </nav>

      {shown.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
          {mistakes.length === 0
            ? "No mistakes yet. Wrong answers from your lessons will show up here."
            : "Nothing left to review: you fixed every one on a later try."}
        </p>
      ) : (
        <ol className="mt-4 flex flex-col gap-4">
          {shown.map((mistake) => (
            <li key={`${mistake.dayNumber}-${mistake.exerciseIndex}`}>
              <MistakeCard trackId={track.id} mistake={mistake} />
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

function MistakeCard({ trackId, mistake }: { trackId: string; mistake: Mistake }) {
  const open = mistake.type === "open";
  // A code answer is shown as code, like on the lesson page.
  const language = open ? answerLanguage(mistake.rightAnswer) : null;

  return (
    <article className="flex min-w-0 flex-col gap-4 rounded-2xl border p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Day {mistake.dayNumber} · Exercise {mistake.exerciseIndex + 1}
        </p>
        {mistake.fixedLater && (
          <Badge variant="secondary">
            <Check />
            Fixed later
          </Badge>
        )}
      </div>
      <h2 className="-mt-2 font-medium whitespace-pre-line">
        <InlineText text={mistake.question} />
      </h2>
      {mistake.code && <CodeBlock block={{ ...mistake.code, output: null, result: null }} />}

      <Answer label="Your answer" tone="wrong">
        {language ? (
          <CodeBlock block={{ language, filename: null, code: mistake.yourAnswer, output: null, result: null }} />
        ) : open ? (
          <p className="whitespace-pre-line">{mistake.yourAnswer}</p>
        ) : (
          <InlineText text={mistake.yourAnswer} />
        )}
      </Answer>

      <Answer label={open ? "An example answer" : "The right answer"} tone="right">
        {open ? <RichText text={mistake.rightAnswer} /> : <InlineText text={mistake.rightAnswer} />}
      </Answer>

      {mistake.why && (
        <div className="text-sm">
          <p className="mb-1 font-medium">{open ? "Feedback" : "Why"}</p>
          {open ? <RichText text={mistake.why} /> : <InlineText text={mistake.why} />}
          {mistake.betterVersion && (
            <div className="mt-3">
              <p className="mb-1 font-medium">A stronger version of yours</p>
              <RichText text={mistake.betterVersion} />
            </div>
          )}
        </div>
      )}

      <Link
        href={`/tracks/${trackId}/day/${mistake.dayNumber}`}
        className="flex w-fit items-center gap-1 text-sm text-primary hover:underline"
      >
        Open the lesson: {mistake.dayTitle}
        <ArrowRight className="size-4" />
      </Link>
    </article>
  );
}

function Answer({ label, tone, children }: { label: string; tone: "right" | "wrong"; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-xl border p-3 text-sm",
        tone === "wrong" ? "border-destructive/30 bg-destructive/5" : "border-success/30 bg-success/5",
      )}
    >
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}
