import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { isDemoMode } from "@/lib/ai/config";
import { requireOnboardedUser } from "@/lib/auth/dal";
import { todayIn } from "@/lib/dates/calendar";
import { NewGoalForm } from "./new-goal-form";

export const metadata: Metadata = { title: "New goal" };

export default function NewGoalPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-8 md:py-10">
      <Link href="/goals" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Goals
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">New goal</h1>
      <p className="mt-1 mb-8 text-muted-foreground">
        A clear finish line, broken into small steps, with time kept free for setbacks.
      </p>

      <Suspense fallback={<div aria-hidden className="h-96 animate-pulse rounded-2xl bg-muted" />}>
        <FormGate />
      </Suspense>
    </main>
  );
}

async function FormGate() {
  const user = await requireOnboardedUser();
  await connection(); // demo mode reads the environment at request time
  // The form uses the user's own "today" for the deadline picker and preview.
  return <NewGoalForm today={todayIn(user.timezone)} demoMode={isDemoMode()} />;
}
