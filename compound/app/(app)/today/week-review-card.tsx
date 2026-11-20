import Link from "next/link";
import { ChartColumn } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { getWeekReview } from "@/lib/review/queries";
import { reviewCardFor } from "@/lib/review/week";

type User = { id: string; timezone: string; created_at: Date };

/**
 * On Sundays and Mondays, Today shows the week's sentence with a link to the
 * full Week in review. Other days it renders nothing and loads nothing.
 */
export async function WeekReviewCard({ user, today }: { user: User; today: string }) {
  const card = reviewCardFor(today);
  if (!card) return null;
  const { review } = await getWeekReview(user, card.week, { withUpcoming: false });

  return (
    <section
      aria-label="Week in review"
      className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-2xl border bg-grid p-4 sm:p-5"
    >
      <div className="min-w-0 flex-1 basis-64">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{card.title}</p>
        <p className="mt-1 font-heading text-lg leading-snug text-balance">{review.sentence}</p>
      </div>
      <Link href={`/review?week=${card.week}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
        <ChartColumn />
        Week in review
      </Link>
    </section>
  );
}
