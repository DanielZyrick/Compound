import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { todayIn } from "@/lib/dates/calendar";
import { getNavGoals } from "@/lib/goals/queries";
import { SidebarGoalLinks } from "./sidebar-goal-links";

/** How many goals the sidebar lists before "See all". */
const SHOWN = 5;

/**
 * The sidebar's Goals section: the first few active goals, each with a
 * status dot. Reads the session, so it streams in inside <Suspense>.
 */
export async function SidebarGoals() {
  const user = await getCurrentUser();
  if (!user?.onboarded_at) return null;
  const goals = await getNavGoals(user.id, todayIn(user.timezone));

  return (
    <section aria-labelledby="sidebar-goals">
      <SidebarGoalsHeading />
      {goals.length === 0 ? (
        <Link href="/goals/new" className="block px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground">
          Set your first goal
        </Link>
      ) : (
        <SidebarGoalLinks goals={goals.slice(0, SHOWN)} />
      )}
      {goals.length > SHOWN && (
        <Link href="/goals" className="block px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground">
          See all {goals.length}
        </Link>
      )}
    </section>
  );
}

export function SidebarGoalsHeading() {
  return (
    <div className="flex items-center justify-between px-2.5 pb-1">
      <h2 id="sidebar-goals" className="text-xs font-medium text-muted-foreground">
        Goals
      </h2>
      <Link
        href="/goals/new"
        aria-label="New goal"
        className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
      >
        <Plus className="size-4" />
      </Link>
    </div>
  );
}
