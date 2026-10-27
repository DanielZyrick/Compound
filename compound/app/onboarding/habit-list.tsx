import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    <ul className="flex flex-col gap-3">
      {habits.map((habit) => (
        <li key={habit.key} className="flex flex-col gap-3 rounded-xl border p-3">
          <div className="flex gap-2">
            <Input
              value={habit.name}
              onChange={(e) => onUpdate(habit.key, { name: e.target.value })}
              placeholder="Habit name, e.g. Read 10 pages"
              maxLength={60}
              aria-label="Habit name"
              className="h-10"
            />
            {habits.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onRemove(habit.key)}
                aria-label={`Remove ${habit.name || "habit"}`}
                className="size-10 text-muted-foreground"
              >
                <X />
              </Button>
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
