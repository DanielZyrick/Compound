import { getCurrentUser } from "@/lib/auth/dal";
import { todayIn } from "@/lib/dates/calendar";
import { goalsNeedAttention } from "@/lib/goals/queries";
import { notesNeedAttention } from "@/lib/notes/queries";
import { NavLinks } from "./nav-links";

/**
 * The nav links plus attention dots: Goals when a goal is behind or at risk,
 * Notes when a to-do is overdue or due today.
 * It reads the session, so it sits inside the nav's <Suspense>: the links show
 * at once without dots, and the dots stream in.
 */
export async function NavWithAttention({ variant }: { variant: "sidebar" | "tabs" }) {
  const user = await getCurrentUser();
  const attention: string[] = [];
  if (user?.onboarded_at) {
    const today = todayIn(user.timezone);
    const [goals, notes] = await Promise.all([goalsNeedAttention(user.id, today), notesNeedAttention(user.id, today)]);
    if (goals) attention.push("/goals");
    if (notes) attention.push("/notes");
  }
  return <NavLinks variant={variant} attention={attention} />;
}
