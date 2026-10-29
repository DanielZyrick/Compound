import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { requireOnboardedUser } from "@/lib/auth/dal";
import { getTracks } from "@/lib/tracks/queries";
import { TrackBadges } from "./track-badges";

export const metadata: Metadata = { title: "Learn" };

export default function TracksPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-8 md:py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Learn</h1>
          <p className="mt-1 text-muted-foreground">Short daily lessons that add up.</p>
        </div>
        <Link href="/tracks/new" className={buttonVariants()}>
          <Plus />
          New track
        </Link>
      </div>

      <div className="mt-8">
        <Suspense fallback={<div aria-hidden className="h-48 animate-pulse rounded-2xl bg-muted" />}>
          <TrackList />
        </Suspense>
      </div>
    </main>
  );
}

async function TrackList() {
  const user = await requireOnboardedUser();
  const tracks = await getTracks(user.id);

  if (tracks.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed p-8 text-center">
        <p className="font-medium">No learning tracks yet.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick something you want to get better at, and get a plan for the next few weeks.
        </p>
        <Link href="/tracks/new" className={buttonVariants({ variant: "outline", className: "mt-4" })}>
          Create your first track
        </Link>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {tracks.map((track) => (
        <li key={track.id}>
          <Link
            href={`/tracks/${track.id}`}
            className="block rounded-xl border p-4 transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
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
        </li>
      ))}
    </ul>
  );
}
