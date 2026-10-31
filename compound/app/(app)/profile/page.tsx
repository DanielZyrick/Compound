import type { Metadata } from "next";
import { Suspense } from "react";
import { requireOnboardedUser } from "@/lib/auth/dal";
import { getProfile } from "@/lib/profile/queries";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "About you" };

export default function ProfilePage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-8 md:py-10">
      <h1 className="text-2xl font-semibold tracking-tight">About you</h1>
      <p className="mt-1 text-muted-foreground">
        A few answers so your principle of the day, learning tracks and goal plans fit you. Every question is optional.
      </p>

      <div className="mt-8 rounded-2xl border p-5">
        <Suspense fallback={<div aria-hidden className="h-96 animate-pulse rounded-xl bg-muted" />}>
          <ProfileContent />
        </Suspense>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Your answers are sent to Claude only to personalise what Compound writes for you. They&apos;re never shared or
        used for anything else.
      </p>
    </main>
  );
}

async function ProfileContent() {
  const user = await requireOnboardedUser();
  return <ProfileForm initial={await getProfile(user.id)} />;
}
