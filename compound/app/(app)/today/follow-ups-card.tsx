"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Check, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { describeFollowUp } from "@/lib/contacts/follow-up";
import type { DueFollowUp } from "@/lib/contacts/queries";
import { logTouchpoint, snoozeFollowUp } from "../contacts/actions";

/**
 * Contacts to follow up with today or earlier. Done logs a touchpoint for
 * today and clears the follow-up; Snooze moves it a week.
 */
export function FollowUpsCard({ contacts, total, today }: { contacts: DueFollowUp[]; total: number; today: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ errors: string[] }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.errors.length > 0) setError(result.errors[0]);
    });
  }

  return (
    <section aria-labelledby="today-follow-ups" className="rounded-2xl border p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <h2 id="today-follow-ups" className="flex items-center gap-2 font-semibold">
          <Users className="size-4 text-primary" aria-hidden />
          Follow up
        </h2>
        <Link
          href="/contacts?filter=due"
          className="rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          See all{total > contacts.length ? ` ${total}` : ""}
        </Link>
      </div>

      <ul className="mt-3 flex flex-col gap-2">
        {contacts.map((contact) => (
          <li key={contact.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border p-3">
            <Link href={`/contacts/${contact.id}`} className="min-w-0 flex-1 hover:underline">
              <span className="block truncate font-medium">{contact.name}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {[contact.company, describeFollowUp(contact.follow_up_on, today).label].filter(Boolean).join(" · ")}
              </span>
            </Link>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                aria-label={`Done: followed up with ${contact.name}`}
                onClick={() => run(() => logTouchpoint({ contactId: contact.id, happenedOn: today, next: "none" }))}
              >
                <Check />
                Done
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                aria-label={`Snooze ${contact.name} for a week`}
                onClick={() => run(() => snoozeFollowUp({ contactId: contact.id }))}
              >
                <Clock />
                Snooze
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
