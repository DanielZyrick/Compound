import { WeekdayPicker } from "@/components/weekday-picker";
import type { Weekday } from "@/lib/db/types";

export type HabitDraft = { key: number; name: string; schedule: Weekday[] };

type Props = {
  habits: HabitDraft[];
  onUpdate: (key: number, changes: Partial<HabitDraft>) => void;
  onRemove: (key: number) => void;
};

export function HabitList({ habits, onUpdate, onRemove }: Props) {
  return (
    <ul className="flex flex-col gap-4">
      {habits.map((habit) => (
        <li key={habit.key} className="flex flex-col gap-2 rounded-lg border border-foreground/15 p-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={habit.name}
              onChange={(e) => onUpdate(habit.key, { name: e.target.value })}
              placeholder="Habit name, e.g. Read 10 pages"
              maxLength={60}
              aria-label="Habit name"
              className="min-w-0 flex-1 rounded-lg border border-foreground/20 bg-transparent px-3 py-2"
            />
            {habits.length > 1 && (
              <button
                type="button"
                onClick={() => onRemove(habit.key)}
                aria-label={`Remove ${habit.name || "habit"}`}
                className="px-2 text-sm opacity-60 hover:opacity-100"
              >
                Remove
              </button>
            )}
          </div>
          <WeekdayPicker
            value={habit.schedule}
            onChange={(schedule) => onUpdate(habit.key, { schedule })}
          />
        </li>
      ))}
    </ul>
  );
}
