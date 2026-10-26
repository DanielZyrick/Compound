import { Suspense } from "react";
import { requireOnboardedUser } from "@/lib/auth/dal";

// Placeholder until the habits step: proves sign-in works end to end.
export default function TodayPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-8 md:py-10">
      <h1 className="text-2xl font-semibold">Today</h1>

      <Suspense fallback={<p className="mt-4 text-muted-foreground">Loading…</p>}>
        <Greeting />
      </Suspense>
    </main>
  );
}

async function Greeting() {
  const user = await requireOnboardedUser();

  return (
    <p className="mt-4 text-muted-foreground">
      Hi, {user.name ?? user.email}. Your habits for today will show up here.
    </p>
  );
}
