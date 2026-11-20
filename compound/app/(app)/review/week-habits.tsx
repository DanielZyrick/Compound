import { formatLongDate } from "@/lib/dates/calendar";
import type { HabitDayStatus, WeekReview } from "@/lib/review/week";
import { cn } from "@/lib/utils";
import { CELL, STATUS_LABELS } from "../progress/checkin-grid";

// The same squares as the Progress grid, plus an outline for days still to come.
const CELLS: Record<HabitDayStatus, string> = { ...CELL, future: "border border-dashed border-muted-foreground/30" };
const LABELS: Record<HabitDayStatus, string> = { ...STATUS_LABELS, future: "Still to come" };

/** Each habit's week as seven squares, Monday first, with how many due days were done. */
export function WeekHabits({ habits }: { habits: WeekReview["habits"] }) {
  return (
    <ul className="mt-3 divide-y rounded-xl border">
      {habits.map((habit) => (
        <li key={habit.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
          <p className="min-w-0 flex-1 basis-40 font-medium wrap-break-word">{habit.name}</p>
          <div className="flex items-center gap-3">
            <ol aria-hidden className="grid grid-cols-7 gap-1">
              {habit.days.map((day) => (
                <li
                  key={day.date}
                  title={`${formatLongDate(day.date)}: ${LABELS[day.status]}`}
                  className={cn("relative size-5 rounded-[3px]", CELLS[day.status])}
                />
              ))}
            </ol>
            <span className="w-14 text-right text-sm tabular-nums text-muted-foreground">
              {habit.due > 0 ? `${habit.done} of ${habit.due}` : habit.done > 0 ? `${habit.done} done` : "—"}
            </span>
            <span className="sr-only">
              {habit.name}: done on {habit.done} of {habit.due} due days this week.
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
