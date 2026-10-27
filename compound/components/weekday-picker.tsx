import type { Weekday } from "@/lib/db/types";
import { cn } from "@/lib/utils";

export const DAYS: { value: Weekday; short: string; name: string }[] = [
  { value: 0, short: "S", name: "Sunday" },
  { value: 1, short: "M", name: "Monday" },
  { value: 2, short: "T", name: "Tuesday" },
  { value: 3, short: "W", name: "Wednesday" },
  { value: 4, short: "T", name: "Thursday" },
  { value: 5, short: "F", name: "Friday" },
  { value: 6, short: "S", name: "Saturday" },
];

type Props = {
  value: Weekday[];
  onChange: (days: Weekday[]) => void;
};

/** A row of 7 toggle buttons for choosing which weekdays a habit is scheduled on. */
export function WeekdayPicker({ value, onChange }: Props) {
  function toggle(day: Weekday) {
    onChange(value.includes(day) ? value.filter((d) => d !== day) : [...value, day]);
  }

  return (
    <div className="flex gap-1" role="group" aria-label="Scheduled days">
      {DAYS.map((day) => {
        const on = value.includes(day.value);
        return (
          <button
            key={day.value}
            type="button"
            aria-label={day.name}
            aria-pressed={on}
            onClick={() => toggle(day.value)}
            className={cn(
              "size-9 rounded-full text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              on ? "bg-primary text-primary-foreground" : "border text-muted-foreground hover:bg-muted",
            )}
          >
            {day.short}
          </button>
        );
      })}
    </div>
  );
}
