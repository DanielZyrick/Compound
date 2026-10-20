import { Suspense } from "react";
import { SignOutButton } from "@/components/auth-buttons";
import { requireOnboardedUser } from "@/lib/auth/dal";

// Placeholder until step 6: proves sign-in works end to end.
export default function TodayPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Today</h1>
        <SignOutButton />
      </div>

      <Suspense fallback={<p className="mt-4 opacity-50">Loading…</p>}>
        <Greeting />
      </Suspense>
    </main>
  );
}

async function Greeting() {
  const user = await requireOnboardedUser();

  return (
    <p className="mt-4 opacity-70">
      Hi, {user.name ?? user.email}. Your habits for today will show up here.
    </p>
  );
}
