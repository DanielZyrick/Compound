import type { WeekDay, WeekDayStatus } from "@/lib/habits/week";
import { cn } from "@/lib/utils";

const WEEKDAY = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" });
const LONG = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });

function asDate(date: string) {
  return new Date(`${date}T00:00:00Z`);
}

function describe(day: WeekDay): string {
  const when = LONG.format(asDate(day.date));
  switch (day.status) {
    case "future":
      return `${when}: upcoming`;
    case "rest":
      return `${when}: no habits due`;
    default:
      return `${when}: ${day.done} of ${day.due} habits done`;
  }
}

// A small mark under each day. Shape and colour together, so it isn't colour alone.
const MARK: Partial<Record<WeekDayStatus, string>> = {
  done: "bg-success",
  partial: "bg-chart-3",
  missed: "border border-muted-foreground/40",
};

/** Monday to Sunday, today highlighted, with a mark for how each day went. */
export function WeekStrip({ days, today }: { days: WeekDay[]; today: string }) {
  return (
    <ol aria-label="This week" className="grid grid-cols-7 gap-1">
      {days.map((day) => {
        const isToday = day.date === today;
        return (
          <li
            key={day.date}
            aria-label={describe(day)}
            aria-current={isToday ? "date" : undefined}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-center",
              isToday ? "bg-primary text-primary-foreground" : day.status === "future" && "text-subtle",
            )}
          >
            <span aria-hidden className={cn("text-[11px]", !isToday && "text-muted-foreground")}>
              {WEEKDAY.format(asDate(day.date))}
            </span>
            <span aria-hidden className="text-sm font-semibold tabular-nums">
              {Number(day.date.slice(8))}
            </span>
            <span
              aria-hidden
              className={cn(
                "size-1.5 rounded-full",
                isToday && day.status !== "pending" ? "bg-primary-foreground" : (MARK[day.status] ?? "bg-transparent"),
              )}
            />
          </li>
        );
      })}
    </ol>
  );
}
