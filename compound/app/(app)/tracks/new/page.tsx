import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { isDemoMode } from "@/lib/ai/config";
import { requireOnboardedUser } from "@/lib/auth/dal";
import { NewTrackForm } from "./new-track-form";

export default function NewTrackPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-8 md:py-10">
      <Link href="/tracks" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Tracks
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">New learning track</h1>
      <p className="mt-1 mb-8 text-muted-foreground">
        A short daily plan, about 10 to 15 minutes a day.
      </p>

      <Suspense fallback={<div aria-hidden className="h-96 animate-pulse rounded-2xl bg-muted" />}>
        <FormGate />
      </Suspense>
    </main>
  );
}

async function FormGate() {
  await requireOnboardedUser();
  await connection(); // read the environment at request time, not at build
  return <NewTrackForm demoMode={isDemoMode()} />;
}
