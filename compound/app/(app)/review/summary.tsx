import { formatLongDate } from "@/lib/dates/calendar";
import { formatMoney } from "@/lib/money/amount";
import { change, type WeekReview } from "@/lib/review/week";
import { cn } from "@/lib/utils";

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

/** The week's sentence, and a dot for each day: filled when the user did something. */
export function ShowedUp({ review }: { review: WeekReview }) {
  return (
    <section aria-label="Summary" className="rounded-2xl border bg-grid p-5 sm:p-6">
      <p className="font-heading text-xl leading-snug text-balance sm:text-2xl">{review.sentence}</p>
      <ol className="mt-5 flex gap-2 sm:gap-3">
        {review.days.map((day, i) => {
          const isToday = review.isCurrentWeek && i === review.daysElapsed - 1;
          const label = day.active ? "showed up" : day.future ? "still to come" : isToday ? "today, nothing yet" : "nothing logged";
          return (
            <li key={day.date} className="flex flex-col items-center gap-1.5" title={`${formatLongDate(day.date)}: ${label}`}>
              <span
                aria-hidden
                className={cn(
                  "size-7 rounded-full sm:size-8",
                  day.active
                    ? "bg-success"
                    : isToday
                      ? "border-2 border-dashed border-primary"
                      : day.future
                        ? "border border-dashed border-muted-foreground/40"
                        : "border-2 border-border bg-background",
                )}
              />
              <span aria-hidden className={cn("text-xs text-muted-foreground", isToday && "font-semibold text-foreground")}>
                {DAY_LETTERS[i]}
              </span>
              <span className="sr-only">
                {formatLongDate(day.date)}: {label}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** The headline numbers, each with how it compares with last week. */
export function StatTiles({ review, currency }: { review: WeekReview; currency: string }) {
  const { totals, previous } = review;
  // A week in progress is compared with the same days of last week.
  const versus = review.isCurrentWeek && review.daysElapsed < 7 ? "this point last week" : "the week before";
  const learned = totals.lessons + totals.readings;

  const tiles = [
    {
      label: "Habit check-ins",
      value: totals.checkinsDue > 0 ? `${totals.checkinsDone} of ${totals.checkinsDue}` : String(totals.checkinsDone),
      note: countChange(totals.checkinsDone, previous.checkinsDone, versus),
    },
    {
      label: "Lessons and readings",
      value: String(learned),
      note: countChange(learned, previous.lessons + previous.readings, versus),
    },
    {
      label: "Goal steps",
      value: String(totals.steps),
      note: countChange(totals.steps, previous.steps, versus),
    },
    {
      label: "Spent",
      value: formatMoney(totals.spentCents, currency),
      note: moneyChange(totals.spentCents, previous.spentCents, versus, currency),
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map((tile) => (
        <div key={tile.label} className="min-w-0 rounded-xl border p-4">
          <dt className="text-xs text-muted-foreground">{tile.label}</dt>
          <dd className="mt-1 truncate text-2xl font-semibold tracking-tight tabular-nums">{tile.value}</dd>
          <dd className="mt-0.5 text-xs text-muted-foreground">{tile.note}</dd>
        </div>
      ))}
    </dl>
  );
}

function countChange(now: number, before: number, versus: string): string {
  const { direction, amount } = change(now, before);
  if (direction === "same") return `Same as ${versus}`;
  return `${direction === "up" ? "+" : "−"}${amount} on ${versus}`;
}

// Spending isn't good or bad by itself, so it reads as more or less, never as a win.
function moneyChange(now: number, before: number, versus: string, currency: string): string {
  const { direction, amount } = change(now, before);
  if (direction === "same") return `Same as ${versus}`;
  return `${formatMoney(amount, currency)} ${direction === "up" ? "more" : "less"} than ${versus}`;
}
