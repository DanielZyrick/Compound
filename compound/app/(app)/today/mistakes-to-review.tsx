import Link from "next/link";
import { ChevronRight, CircleAlert } from "lucide-react";
import { getMistakeCounts } from "@/lib/mistakes/queries";

/**
 * Under Today's learning: one line per active track with mistakes left to
 * review. Streamed in its own Suspense, so it never holds up the page.
 */
export async function MistakesToReview({ userId }: { userId: string }) {
  const counts = await getMistakeCounts(userId);
  if (counts.length === 0) return null;

  return (
    <ul aria-label="Mistakes to review" className="mt-3 flex flex-col gap-1 border-t pt-3">
      {counts.map(({ trackId, trackTitle, count }) => (
        <li key={trackId}>
          <Link
            href={`/tracks/${trackId}/mistakes`}
            className="flex items-center gap-3 rounded-xl p-2 text-sm outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <CircleAlert className="size-4 shrink-0 text-primary" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="font-medium tabular-nums">
                {count} {count === 1 ? "mistake" : "mistakes"} to review
              </span>
              <span className="block truncate text-xs text-muted-foreground">{trackTitle}</span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
