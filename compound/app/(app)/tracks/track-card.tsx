"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Archive, ArrowRight, Ellipsis } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TrackLevel, TrackType } from "@/lib/db/types";
import { setTrackArchived } from "./archive-actions";
import { TrackBadges } from "./track-badges";

type Track = {
  id: string;
  title: string;
  type: TrackType;
  level: TrackLevel | null;
  total_days: number;
  plan_source: "ai" | "demo" | "fixed";
  doneDays: number;
};

/** A track on Learn: the card opens it; the ⋯ menu can open or archive it. */
export function TrackCard({ track }: { track: Track }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="relative">
      <Link
        href={`/tracks/${track.id}`}
        className="block rounded-xl border p-4 pr-12 transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="font-medium">{track.title}</p>
          <p className="shrink-0 text-sm text-muted-foreground tabular-nums">
            {track.doneDays} of {track.total_days} done
          </p>
        </div>
        <div className="mt-2">
          <TrackBadges type={track.type} level={track.level} planSource={track.plan_source} />
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${(track.doneDays / track.total_days) * 100}%` }}
          />
        </div>
      </Link>

      {/* Outside the link: a button can't sit inside one. */}
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`More for ${track.title}`}
          className="absolute top-3 right-2 grid size-8 place-items-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Ellipsis className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem render={<Link href={`/tracks/${track.id}`} />}>
            <ArrowRight />
            Open
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setConfirming(true)}>
            <Archive />
            Archive
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {confirming && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border bg-muted/40 p-3 text-sm">
          <p className="min-w-0 flex-1">
            Archive <span className="font-medium">{track.title}</span>? Your progress is kept.
          </p>
          <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await setTrackArchived({ id: track.id, archived: true });
                if (result.errors.length > 0) setError(result.errors[0]);
                setConfirming(false);
              })
            }
          >
            Archive
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-1 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
