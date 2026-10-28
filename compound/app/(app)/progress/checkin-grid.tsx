import { formatLongDate } from "@/lib/dates/calendar";
import { gridSummary, type DayStatus, type GridDay } from "@/lib/progress/grid";
import { cn } from "@/lib/utils";

// Each status has its own shape, not just its own colour: green and red are
// hard to tell apart with red-green colour blindness.
const CELL: Record<DayStatus, string> = {
  done: "bg-success",
  missed: "border-2 border-destructive/70",
  pending: "border-2 border-dashed border-primary",
  off: "after:absolute after:inset-0 after:m-auto after:size-1 after:rounded-full after:bg-muted-foreground/40",
  before: "bg-muted", // a faint placeholder keeps the 30-day frame visible
};

export const STATUS_LABELS: Record<DayStatus, string> = {
  done: "Done",
  missed: "Missed",
  pending: "Today, not done yet",
  off: "Not scheduled",
  before: "Before this habit",
};

/** 30 small squares, oldest on the left. Hover a square for its date and status. */
export function CheckinGrid({ grid, name }: { grid: GridDay[]; name: string }) {
  const { done, scheduled } = gridSummary(grid);
  return (
    <div>
      <p className="sr-only">
        {name}: done on {done} of {scheduled} scheduled days in the last {grid.length} days.
      </p>
      <ol aria-hidden className="grid grid-cols-15 gap-1 sm:grid-cols-30">
        {grid.map((day) => (
          <li
            key={day.date}
            title={`${formatLongDate(day.date)}: ${STATUS_LABELS[day.status]}`}
            className={cn("relative aspect-square rounded-[3px]", CELL[day.status])}
          />
        ))}
      </ol>
    </div>
  );
}

export function GridLegend() {
  const shown: DayStatus[] = ["done", "missed", "pending", "off", "before"];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {shown.map((status) => (
        <li key={status} className="flex items-center gap-1.5">
          <span aria-hidden className={cn("relative inline-block size-3 rounded-[3px]", CELL[status])} />
          {STATUS_LABELS[status]}
        </li>
      ))}
    </ul>
  );
}
