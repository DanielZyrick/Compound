"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavGoal } from "@/lib/goals/queries";
import { cn } from "@/lib/utils";

// The dot's colour matches the goal's status badge; the label is there for
// screen readers and on hover, so status isn't shown by colour alone.
const DOT: Record<NavGoal["status"], { className: string; label: string }> = {
  on_track: { className: "bg-primary", label: "On track" },
  behind: { className: "bg-chart-3", label: "Behind, using buffer" },
  at_risk: { className: "bg-destructive", label: "At risk" },
  completed: { className: "bg-success", label: "Completed" },
};

/** The goal links, with the current goal highlighted. Render inside <Suspense> (usePathname). */
export function SidebarGoalLinks({ goals }: { goals: NavGoal[] }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-0.5">
      {goals.map((goal) => {
        const href = `/goals/${goal.id}`;
        const active = pathname === href;
        const dot = DOT[goal.status];
        return (
          <li key={goal.id}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              title={`${goal.title} · ${dot.label}`}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm",
                active
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
              <span aria-hidden className={cn("size-2 shrink-0 rounded-[3px]", dot.className)} />
              <span className="truncate">{goal.title}</span>
              <span className="sr-only">({dot.label})</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
