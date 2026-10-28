import { getCurrentUser } from "@/lib/auth/dal";
import { todayIn } from "@/lib/dates/calendar";
import { goalsNeedAttention } from "@/lib/goals/queries";
import { NavLinks } from "./nav-links";

/**
 * The nav links plus attention dots (Goals, when a goal is behind or at risk).
 * It reads the session, so it sits inside the nav's <Suspense>: the links show
 * at once without dots, and the dots stream in.
 */
export async function NavWithAttention({ variant }: { variant: "sidebar" | "tabs" }) {
  const user = await getCurrentUser();
  const attention =
    user?.onboarded_at && (await goalsNeedAttention(user.id, todayIn(user.timezone))) ? ["/goals"] : [];
  return <NavLinks variant={variant} attention={attention} />;
}
