import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireOnboardedUser } from "@/lib/auth/dal";
import { getNotes, type NoteFilter } from "@/lib/notes/queries";
import { cn } from "@/lib/utils";
import { NotesManager } from "./notes-manager";
import { QuickAddNote } from "./quick-add";

export const metadata: Metadata = { title: "Notes" };

const FILTERS: { value: NoteFilter; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "done", label: "Done" },
  { value: "all", label: "All" },
];

export default function NotesPage({ searchParams }: PageProps<"/notes">) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-8 md:py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Notes</h1>
      <p className="mt-1 text-muted-foreground">Quick notes and to-dos. Pin what matters; tick off what&apos;s done.</p>

      <div className="mt-6">
        <QuickAddNote />
      </div>

      <Suspense fallback={<div aria-hidden className="mt-6 h-64 animate-pulse rounded-2xl bg-muted" />}>
        <NotesList searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function NotesList({ searchParams }: Pick<PageProps<"/notes">, "searchParams">) {
  const user = await requireOnboardedUser();
  const raw = (await searchParams).filter;
  const filter = FILTERS.find((f) => f.value === raw)?.value ?? "open";
  const notes = await getNotes(user.id, filter);

  return (
    <>
      <nav aria-label="Show" className="mt-6 flex gap-1">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value === "open" ? "/notes" : `/notes?filter=${f.value}`}
            aria-current={f.value === filter ? "page" : undefined}
            className={cn(
              "rounded-full px-3 py-1 text-sm",
              f.value === filter ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      <div className="mt-4">
        {notes.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
            {filter === "done" ? "Nothing ticked off yet." : "No notes yet. Write one above."}
          </p>
        ) : (
          <NotesManager key={filter} notes={notes} />
        )}
      </div>
    </>
  );
}
