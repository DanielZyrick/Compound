import { TimezoneSelect } from "@/components/timezone-select";
import { Label } from "@/components/ui/label";
import { describeSchedule } from "@/lib/dates/schedule";
import { GOAL_LABELS } from "@/lib/onboarding/goals";
import type { FocusDraft } from "./focus-step";
import type { HabitDraft } from "./habit-list";

type Props = {
  focus: FocusDraft;
  habits: HabitDraft[];
  timezone: string | null;
  onTimezoneChange: (timezone: string) => void;
  onEdit: (step: number) => void;
};

export function ReviewStep({ focus, habits, timezone, onTimezoneChange, onEdit }: Props) {
  const focusName =
    focus.goal === "custom" ? focus.customLabel.trim() : focus.goal && GOAL_LABELS[focus.goal];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="timezone">Your timezone</Label>
        <TimezoneSelect value={timezone} onChange={onTimezoneChange} />
        <p className="text-xs text-muted-foreground">
          Used to decide when your day starts and ends.
        </p>
      </div>

      <SummaryCard title="Focus" onEdit={() => onEdit(0)}>
        <p className="font-medium">{focusName}</p>
        <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">
          {focus.description.trim()}
        </p>
      </SummaryCard>

      <SummaryCard title="Habits" onEdit={() => onEdit(1)}>
        <ul className="flex flex-col gap-1.5 text-sm">
          {habits.map((habit) => (
            <li key={habit.key} className="flex justify-between gap-4">
              <span className="font-medium">{habit.name.trim()}</span>
              <span className="shrink-0 text-muted-foreground">
                {describeSchedule(habit.schedule)}
              </span>
            </li>
          ))}
        </ul>
      </SummaryCard>
    </div>
  );
}

function SummaryCard({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-muted/40 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {title}
        </h3>
        <button
          type="button"
          onClick={onEdit}
          className="text-sm text-primary hover:underline"
          aria-label={`Edit ${title.toLowerCase()}`}
        >
          Edit
        </button>
      </div>
      {children}
    </section>
  );
}
