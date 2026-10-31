"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { RefreshCw, Sparkles, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import type { RecommendationsState } from "@/lib/recommendations/queries";
import type { TrackIdea } from "@/lib/recommendations/recommend";
import { loadRecommendations } from "./recommendation-actions";
import { TrackBadges } from "./track-badges";

/** The new-track form, filled in with an idea. */
function startHref(idea: TrackIdea) {
  const params = new URLSearchParams({
    topic: idea.topic,
    type: idea.type,
    level: idea.level,
    days: String(idea.totalDays),
  });
  return `/tracks/new?${params}`;
}

/**
 * "Recommended for you" on Learn. Saved ideas come from the server; when
 * they're missing or older than the profile, the card asks for new ones once
 * it's on screen, so the AI is only called for a real visit.
 */
export function Recommendations({ initial }: { initial: RecommendationsState }) {
  const [saved, setSaved] = useState(initial.status === "no-profile" ? null : initial.saved);
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const requested = useRef(false);

  function load(fresh: boolean) {
    setError(null);
    startLoading(async () => {
      const result = await loadRecommendations({ fresh });
      setSaved(result.saved);
      setError(result.error);
    });
  }

  useEffect(() => {
    // The ref stops a second request when React runs effects twice in development.
    if (initial.status !== "stale" || requested.current) return;
    requested.current = true;
    load(false);
  }, [initial.status]);

  if (initial.status === "no-profile") {
    return (
      <section
        aria-label="Recommended for you"
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed p-4"
      >
        <p className="text-sm">
          <span className="font-medium">Get track ideas made for you.</span>{" "}
          <span className="text-muted-foreground">Tell Compound what you do and what you want to get better at.</span>
        </p>
        <Link href="/profile" className={buttonVariants({ variant: "outline", size: "sm" })}>
          <UserRound />
          Fill in About you
        </Link>
      </section>
    );
  }

  return (
    <section aria-labelledby="recommended-heading" className="rounded-2xl border p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2 id="recommended-heading" className="flex items-center gap-2 font-semibold whitespace-nowrap">
          <Sparkles className="size-4 text-primary" />
          Recommended for you
        </h2>
        <div className="flex items-center gap-2">
          {saved?.source === "demo" && <Badge variant="outline">Example</Badge>}
          {saved && (
            <Button variant="ghost" size="sm" onClick={() => load(true)} disabled={loading}>
              <RefreshCw className={loading ? "animate-spin" : undefined} />
              Suggest others
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-3 text-sm">
          <p role="alert" className="text-destructive">
            {error}
          </p>
          {!saved && (
            <Button variant="outline" size="sm" onClick={() => load(false)} disabled={loading} className="mt-2">
              Try again
            </Button>
          )}
        </div>
      )}

      {saved ? (
        <ul aria-busy={loading} className="mt-4 flex flex-col gap-3">
          {saved.tracks.map((idea) => (
            <li key={idea.topic} className="flex flex-col gap-2 rounded-xl border p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="font-medium break-words">{idea.topic}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{idea.reason}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <TrackBadges type={idea.type} level={idea.level} planSource="ai" />
                  <Badge variant="secondary">{idea.totalDays} days</Badge>
                </div>
              </div>
              <Link
                href={startHref(idea)}
                aria-label={`Start ${idea.topic}`}
                className={buttonVariants({ variant: "outline", size: "sm", className: "self-start sm:self-center" })}
              >
                Start this
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        !error && (
          <div aria-busy className="mt-4 animate-pulse space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-muted" />
            ))}
            <span className="sr-only">Finding tracks that fit you…</span>
          </div>
        )
      )}
    </section>
  );
}
