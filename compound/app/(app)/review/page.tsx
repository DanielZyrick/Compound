import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { requireOnboardedUser } from "@/lib/auth/dal";
import { weekLabel } from "@/lib/calendar/week";
import { addDays, formatShortDate } from "@/lib/dates/calendar";
import { weekStart } from "@/lib/habits/week";
import { formatMoney } from "@/lib/money/amount";
import { getWeekReview } from "@/lib/review/queries";
import type { UpcomingItem, WeekReview } from "@/lib/review/week";
import { cn } from "@/lib/utils";
import { DoneList } from "./done-list";
import { ShowedUp, StatTiles } from "./summary";
import { WeekHabits } from "./week-habits";

export const metadata: Metadata = { title: "Week in review" };

export default function ReviewPage({ searchParams }: PageProps<"/review">) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-8 md:py-10">
      <Suspense fallback={<div aria-hidden className="h-96 animate-pulse rounded-2xl bg-muted" />}>
        <Review searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Review({ searchParams }: Pick<PageProps<"/review">, "searchParams">) {
  const user = await requireOnboardedUser();
  const { review, today, earliest, upcoming, mistakeCounts } = await getWeekReview(user, (await searchParams).week);
  const current = weekStart(today);

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Week in review</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {review.isCurrentWeek ? "This week so far" : review.monday === addDays(current, -7) ? "Last week" : "Looking back"}
          </p>
        </div>
        <WeekNav monday={review.monday} earliest={earliest} current={current} />
      </header>

      <div className="mt-8 flex flex-col gap-10">
        <ShowedUp review={review} />
        <StatTiles review={review} currency={user.currency} />

        {review.habits.length > 0 && (
          <section aria-labelledby="habits-heading">
            <h2 id="habits-heading" className="text-lg font-semibold">
              Habits
            </h2>
            <WeekHabits habits={review.habits} />
          </section>
        )}

        <section aria-labelledby="done-heading">
          <h2 id="done-heading" className="text-lg font-semibold">
            What you got done
          </h2>
          <DoneList done={review.done} />
        </section>

        {review.categories.length > 0 && <Spending review={review} currency={user.currency} />}
        {upcoming.length > 0 && <ComingUp items={upcoming} today={today} />}
        {mistakeCounts.length > 0 && <StillToReview counts={mistakeCounts} />}
      </div>
    </>
  );
}

function WeekNav({ monday, earliest, current }: { monday: string; earliest: string; current: string }) {
  const atStart = monday <= earliest;
  const atEnd = monday >= current;
  const step = (href: string, label: string, disabled: boolean, icon: React.ReactNode) => (
    <Link
      href={href}
      aria-label={label}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : undefined}
      className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), disabled && "pointer-events-none opacity-40")}
    >
      {icon}
    </Link>
  );
  return (
    <nav aria-label="Week" className="flex items-center gap-2">
      <Link
        href={`/review?week=${current}`}
        aria-disabled={atEnd}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), atEnd && "pointer-events-none opacity-50")}
      >
        This week
      </Link>
      {step(`/review?week=${addDays(monday, -7)}`, "Previous week", atStart, <ChevronLeft />)}
      <span className="min-w-36 text-center text-sm font-medium tabular-nums">{weekLabel(monday)}</span>
      {step(`/review?week=${addDays(monday, 7)}`, "Next week", atEnd, <ChevronRight />)}
    </nav>
  );
}

/** Where the money went: the biggest categories, with a link to the full month. */
function Spending({ review, currency }: { review: WeekReview; currency: string }) {
  const top = review.categories.slice(0, 3);
  const rest = review.categories.slice(3).reduce((sum, c) => sum + c.cents, 0);
  return (
    <section aria-labelledby="spending-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="spending-heading" className="text-lg font-semibold">
          Where the money went
        </h2>
        <Link href={`/money?month=${review.monday.slice(0, 7)}`} className="text-sm text-primary underline-offset-4 hover:underline">
          Open Money
        </Link>
      </div>
      <ul className="mt-3 divide-y rounded-xl border">
        {top.map((c) => (
          <li key={c.categoryId} className="flex items-baseline justify-between gap-3 px-4 py-2.5 text-sm">
            <span className="min-w-0 truncate">{c.name}</span>
            <span className="shrink-0 tabular-nums">{formatMoney(c.cents, currency)}</span>
          </li>
        ))}
        {rest > 0 && (
          <li className="flex items-baseline justify-between gap-3 px-4 py-2.5 text-sm text-muted-foreground">
            <span>Everything else</span>
            <span className="shrink-0 tabular-nums">{formatMoney(rest, currency)}</span>
          </li>
        )}
      </ul>
    </section>
  );
}

const UPCOMING_KIND: Record<UpcomingItem["kind"], string> = {
  milestone: "Milestone",
  todo: "To-do",
  "follow-up": "Follow up",
};

function ComingUp({ items, today }: { items: UpcomingItem[]; today: string }) {
  return (
    <section aria-labelledby="upcoming-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="upcoming-heading" className="text-lg font-semibold">
          Coming up
        </h2>
        <span className="text-sm text-muted-foreground">Next 7 days</span>
      </div>
      <ul className="mt-3 divide-y rounded-xl border">
        {items.map((item) => (
          <li key={`${item.kind}-${item.href}-${item.title}-${item.due}`}>
            <Link href={item.href} className="flex items-baseline gap-3 px-4 py-2.5 text-sm outline-none hover:bg-muted focus-visible:bg-muted">
              <span className="w-14 shrink-0 tabular-nums text-muted-foreground">{formatShortDate(item.due, today.slice(0, 4))}</span>
              <span className="min-w-0 flex-1">
                <span className="wrap-break-word">{item.title}</span>
                <span className="block text-xs text-muted-foreground">
                  {UPCOMING_KIND[item.kind]}
                  {item.detail ? ` · ${item.detail}` : ""}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Mistakes left to review, per track: something to pick up next week. */
function StillToReview({ counts }: { counts: { trackId: string; trackTitle: string; count: number }[] }) {
  return (
    <section aria-labelledby="review-mistakes-heading">
      <h2 id="review-mistakes-heading" className="text-lg font-semibold">
        Mistakes to review
      </h2>
      <ul className="mt-3 divide-y rounded-xl border">
        {counts.map(({ trackId, trackTitle, count }) => (
          <li key={trackId}>
            <Link
              href={`/tracks/${trackId}/mistakes`}
              className="flex items-baseline gap-3 px-4 py-2.5 text-sm outline-none hover:bg-muted focus-visible:bg-muted"
            >
              <span className="min-w-0 flex-1 wrap-break-word">{trackTitle}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {count} {count === 1 ? "mistake" : "mistakes"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
