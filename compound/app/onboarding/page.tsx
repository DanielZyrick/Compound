import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { requireUser } from "@/lib/auth/dal";
import { OnboardingForm } from "./onboarding-form";

export default function OnboardingPage() {
  return (
    <main className="flex flex-1 justify-center bg-muted bg-dots px-4 py-10 sm:py-16">
      <div className="w-full max-w-xl">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-[28px] border bg-card p-6 shadow-card sm:p-10">
          <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
            <OnboardingGate />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

// Only signed-in users who haven't onboarded yet see the form.
async function OnboardingGate() {
  const user = await requireUser();
  if (user.onboarded_at) redirect("/today");
  return <OnboardingForm />;
}
