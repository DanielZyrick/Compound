import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarClock, ChevronRight, Search, Target } from "lucide-react";
import { Input } from "@/components/ui/input";
import { requireOnboardedUser } from "@/lib/auth/dal";
import { describeFollowUp } from "@/lib/contacts/follow-up";
import { getContacts, type ContactFilter } from "@/lib/contacts/queries";
import { todayIn } from "@/lib/dates/calendar";
import { cn } from "@/lib/utils";
import { QuickAddContact } from "./quick-add";

export const metadata: Metadata = { title: "Contacts" };

const FILTERS: { value: ContactFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "due", label: "Follow up due" },
  { value: "goal", label: "Linked to a goal" },
];

export default function ContactsPage({ searchParams }: PageProps<"/contacts">) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-8 md:py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
      <p className="mt-1 text-muted-foreground">
        People you meet for work. Note where you met, and when to follow up.
      </p>

      <div className="mt-6">
        <QuickAddContact />
      </div>

      <Suspense fallback={<div aria-hidden className="mt-6 h-64 animate-pulse rounded-2xl bg-muted" />}>
        <ContactList searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

function hrefFor(filter: ContactFilter, search: string) {
  const params = new URLSearchParams();
  if (filter !== "all") params.set("filter", filter);
  if (search) params.set("q", search);
  const query = params.toString();
  return query ? `/contacts?${query}` : "/contacts";
}

async function ContactList({ searchParams }: Pick<PageProps<"/contacts">, "searchParams">) {
  const user = await requireOnboardedUser();
  const params = await searchParams;
  const filter = FILTERS.find((f) => f.value === params.filter)?.value ?? "all";
  const search = typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";
  const today = todayIn(user.timezone);
  const contacts = await getContacts(user.id, { search, filter, today });

  return (
    <>
      {/* A plain GET form: search works before JavaScript loads, and the URL can be shared. */}
      <form action="/contacts" role="search" className="relative mt-6">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
        <Input
          name="q"
          type="search"
          defaultValue={search}
          placeholder="Search by name, company or role"
          aria-label="Search contacts"
          className="h-10 pl-9"
        />
      </form>

      <nav aria-label="Show" className="mt-3 flex flex-wrap gap-1">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={hrefFor(f.value, search)}
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

      {contacts.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
          {search
            ? `No contacts match "${search}".`
            : filter === "due"
              ? "No follow-ups due. Nice."
              : filter === "goal"
                ? "No contacts are linked to a goal yet."
                : "No contacts yet. Add someone you met above."}
        </p>
      ) : (
        <ul className="mt-4 divide-y rounded-2xl border">
          {contacts.map((contact) => {
            const followUp = contact.follow_up_on ? describeFollowUp(contact.follow_up_on, today) : null;
            const work = [contact.role, contact.company].filter(Boolean).join(" at ");
            return (
              <li key={contact.id}>
                <Link
                  href={`/contacts/${contact.id}`}
                  className="flex items-center gap-3 p-4 transition-colors outline-none first:rounded-t-2xl last:rounded-b-2xl hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span
                    aria-hidden
                    className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
                  >
                    {contact.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{contact.name}</span>
                    {work && <span className="block truncate text-sm text-muted-foreground">{work}</span>}
                    <span className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                      {followUp && (
                        <span
                          className={cn(
                            "flex items-center gap-1",
                            followUp.due ? "font-medium text-destructive" : "text-muted-foreground",
                          )}
                        >
                          <CalendarClock aria-hidden className="size-3.5" />
                          Follow up: {followUp.label}
                        </span>
                      )}
                      {contact.goal_title && (
                        <span className="flex min-w-0 items-center gap-1 text-muted-foreground">
                          <Target aria-hidden className="size-3.5 shrink-0" />
                          <span className="truncate">{contact.goal_title}</span>
                        </span>
                      )}
                    </span>
                  </span>
                  <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
