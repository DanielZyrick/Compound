import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { OnboardingForm } from "./onboarding-form";

export default function OnboardingPage() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10">
      <h1 className="text-3xl font-semibold">Welcome to Compound</h1>
      <p className="mt-2 mb-10 opacity-70">
        Small daily steps, compounding growth. Let&apos;s set up your first steps.
      </p>

      <Suspense fallback={<p className="opacity-50">Loading…</p>}>
        <OnboardingGate />
      </Suspense>
    </main>
  );
}

// Only signed-in users who haven't onboarded yet see the form.
async function OnboardingGate() {
  const user = await requireUser();
  if (user.onboarded_at) redirect("/today");
  return <OnboardingForm />;
}
