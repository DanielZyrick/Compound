import { AlertTriangle, CircleCheck, Clock, TrendingUp } from "lucide-react";
import type { GoalStatusLevel } from "@/lib/goals/schedule";
import { cn } from "@/lib/utils";

// Status is never shown by colour alone: each one has its own icon and label.
const STATUS: Record<GoalStatusLevel, { label: string; icon: typeof Clock; className: string }> = {
  on_track: { label: "On track", icon: TrendingUp, className: "bg-primary/10 text-primary" },
  behind: { label: "Behind, using buffer", icon: Clock, className: "bg-chart-3/15 text-foreground" },
  at_risk: { label: "At risk", icon: AlertTriangle, className: "bg-destructive/10 text-destructive" },
  completed: { label: "Completed", icon: CircleCheck, className: "bg-success/10 text-success" },
};

export function GoalStatusBadge({ status, className }: { status: GoalStatusLevel; className?: string }) {
  const { label, icon: Icon, className: tone } = STATUS[status];
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", tone, className)}
    >
      <Icon className="size-3.5" aria-hidden />
      {label}
    </span>
  );
}

/** "12 days left", "Due today", "3 days overdue". */
export function daysLeftLabel(daysLeft: number): string {
  if (daysLeft > 1) return `${daysLeft} days left`;
  if (daysLeft === 1) return "1 day left";
  if (daysLeft === 0) return "Due today";
  return `${-daysLeft} ${daysLeft === -1 ? "day" : "days"} overdue`;
}
