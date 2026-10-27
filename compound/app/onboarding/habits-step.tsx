import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Goal } from "@/lib/db/types";
import { HABIT_SUGGESTIONS } from "@/lib/onboarding/goals";
import { MAX_HABITS } from "@/lib/validation/onboarding";
import { HabitList, type HabitDraft } from "./habit-list";

type Props = {
  goal: Goal | null;
  habits: HabitDraft[];
  onUpdate: (key: number, changes: Partial<HabitDraft>) => void;
  onRemove: (key: number) => void;
  onAdd: (name?: string) => void;
};

export function HabitsStep({ goal, habits, onUpdate, onRemove, onAdd }: Props) {
  // Ideas for the chosen focus, minus habits already added.
  const taken = new Set(habits.map((h) => h.name.trim().toLowerCase()));
  const suggestions = (goal ? HABIT_SUGGESTIONS[goal] : []).filter(
    (name) => !taken.has(name.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-4">
      {suggestions.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium">Ideas</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((name) => (
              <Button key={name} type="button" variant="outline" size="sm" onClick={() => onAdd(name)}>
                <Plus />
                {name}
              </Button>
            ))}
          </div>
        </div>
      )}

      <HabitList habits={habits} onUpdate={onUpdate} onRemove={onRemove} />

      {habits.length < MAX_HABITS && (
        <Button type="button" variant="ghost" onClick={() => onAdd()} className="self-start">
          <Plus />
          Add another habit
        </Button>
      )}
    </div>
  );
}
