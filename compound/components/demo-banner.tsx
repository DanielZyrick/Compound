import { Eye } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { DEMO_LIFETIME_HOURS } from "@/lib/demo/data";
import { leaveDemo } from "@/lib/demo/actions";

/** A strip at the top of every page while someone is exploring a demo account. Reads the session: keep it in <Suspense>. */
export async function DemoBanner() {
  const user = await getCurrentUser();
  if (!user?.is_demo) return null;

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b bg-primary/10 px-4 py-2 text-center text-sm"
    >
      <span className="flex items-center gap-1.5">
        <Eye className="size-4 text-primary" aria-hidden />
        You&apos;re exploring a demo with sample data. It&apos;s deleted after {DEMO_LIFETIME_HOURS} hours.
      </span>
      <form action={leaveDemo}>
        <button type="submit" className="font-medium text-primary underline underline-offset-4 hover:no-underline">
          Sign in to start your own
        </button>
      </form>
    </div>
  );
}
