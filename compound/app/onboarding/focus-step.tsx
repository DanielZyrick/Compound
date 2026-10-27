import { Briefcase, Church, HeartPulse, Rocket, Sparkles, type LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GOALS, type Goal } from "@/lib/db/types";
import { DESCRIPTION_EXAMPLES, GOAL_HINTS, GOAL_LABELS } from "@/lib/onboarding/goals";
import { DESCRIPTION_MAX, DESCRIPTION_MIN } from "@/lib/validation/onboarding";

export type FocusDraft = { goal: Goal | null; customLabel: string; description: string };

const GOAL_ICONS: Record<Goal, LucideIcon> = {
  career: Briefcase,
  business: Rocket,
  faith: Church,
  health: HeartPulse,
  custom: Sparkles,
};

type Props = {
  focus: FocusDraft;
  onChange: (changes: Partial<FocusDraft>) => void;
};

export function FocusStep({ focus, onChange }: Props) {
  return (
    <div className="flex flex-col gap-6">
      {/* Native radio buttons, visually hidden, so arrow keys and screen
          readers work as expected; the label is the visible card. */}
      <fieldset>
        <legend className="mb-3 text-sm font-medium">Focus</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {GOALS.map((goal) => {
            const Icon = GOAL_ICONS[goal];
            return (
              <label
                key={goal}
                className="flex cursor-pointer flex-col gap-1 rounded-xl border p-3 transition-colors hover:bg-muted has-checked:border-primary has-checked:bg-primary/5 has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
              >
                <input
                  type="radio"
                  name="focus"
                  value={goal}
                  checked={focus.goal === goal}
                  onChange={() => onChange({ goal })}
                  className="sr-only"
                />
                <Icon className="mb-1 size-5 text-primary" />
                <span className="text-sm font-medium">{GOAL_LABELS[goal]}</span>
                <span className="text-xs text-muted-foreground">{GOAL_HINTS[goal]}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {focus.goal === "custom" && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="custom-label">Name your focus</Label>
          <Input
            id="custom-label"
            value={focus.customLabel}
            onChange={(e) => onChange({ customLabel: e.target.value })}
            placeholder="e.g. Learn guitar"
            maxLength={50}
            className="h-10"
          />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Describe what you want to achieve</Label>
        <Textarea
          id="description"
          value={focus.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder={DESCRIPTION_EXAMPLES[focus.goal ?? "career"]}
          maxLength={DESCRIPTION_MAX}
          aria-describedby="description-help"
          className="min-h-28"
        />
        <div id="description-help" className="flex justify-between gap-4 text-xs text-muted-foreground">
          <span>Be specific: what, and by when. At least {DESCRIPTION_MIN} characters.</span>
          <span className="whitespace-nowrap tabular-nums">
            {focus.description.length} / {DESCRIPTION_MAX}
          </span>
        </div>
      </div>
    </div>
  );
}
