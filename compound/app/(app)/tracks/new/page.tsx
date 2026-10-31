import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { isDemoMode } from "@/lib/ai/config";
import { requireOnboardedUser } from "@/lib/auth/dal";
import { TRACK_LEVELS } from "@/lib/db/types";
import { TRACK_LENGTHS } from "@/lib/tracks/plan";
import { NewTrackForm, type TrackPrefill } from "./new-track-form";

export const metadata: Metadata = { title: "New track" };

// "Start this" on a recommendation links here with the idea in the URL. It
// only fills in the form; the user can change anything before creating.
const prefillSchema = z.object({
  topic: z.string().trim().min(1).max(120),
  type: z.enum(["skill", "thinking"]),
  level: z.enum(TRACK_LEVELS),
  days: z.coerce.number().pipe(z.literal(TRACK_LENGTHS)),
});

export default function NewTrackPage({ searchParams }: PageProps<"/tracks/new">) {
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
        <FormGate searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function FormGate({ searchParams }: Pick<PageProps<"/tracks/new">, "searchParams">) {
  await requireOnboardedUser();
  await connection(); // read the environment at request time, not at build
  const parsed = prefillSchema.safeParse(await searchParams);
  const prefill: TrackPrefill | null = parsed.success
    ? { topic: parsed.data.topic, type: parsed.data.type, level: parsed.data.level, totalDays: parsed.data.days }
    : null;
  return <NewTrackForm demoMode={isDemoMode()} prefill={prefill} />;
}
