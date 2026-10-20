import type { Goal } from "@/lib/db/types";
import { GOALS } from "@/lib/db/types";
import { GOAL_LABELS } from "@/lib/onboarding/goals";

type Props = {
  selected: Goal[];
  onToggle: (goal: Goal) => void;
  customLabel: string;
  onCustomLabelChange: (label: string) => void;
};

export function GoalPicker({ selected, onToggle, customLabel, onCustomLabelChange }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {GOALS.map((goal) => {
          const on = selected.includes(goal);
          return (
            <button
              key={goal}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(goal)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                on ? "bg-foreground text-background" : "border border-foreground/20"
              }`}
            >
              {GOAL_LABELS[goal]}
            </button>
          );
        })}
      </div>

      {selected.includes("custom") && (
        <input
          type="text"
          value={customLabel}
          onChange={(e) => onCustomLabelChange(e.target.value)}
          placeholder="Your goal, e.g. Learn guitar"
          maxLength={50}
          aria-label="Custom goal"
          className="rounded-lg border border-foreground/20 bg-transparent px-3 py-2"
        />
      )}
    </div>
  );
}
