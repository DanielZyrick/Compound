"use client";

import { useState, useTransition } from "react";
import { CalendarDays } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { disconnectCalendar } from "./actions";

// The message after coming back from Google (?calendar=...).
const STATUS: Record<string, { text: string; ok: boolean }> = {
  connected: { text: "Google Calendar is connected.", ok: true },
  denied: { text: "Nothing changed: you cancelled on Google's screen.", ok: false },
  "no-access": { text: "Compound needs the calendar box ticked on Google's screen. Try again.", ok: false },
  failed: { text: "Connecting didn't work. Please try again.", ok: false },
  unavailable: { text: "Google Calendar isn't set up on this server yet.", ok: false },
};

export function CalendarSection({
  available,
  email,
  status,
}: {
  available: boolean;
  email: string | null | undefined; // undefined: not connected
  status: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const message = status ? STATUS[status] : undefined;
  const connected = email !== undefined;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        See today&apos;s events next to your habits and goals. Compound can only read your calendar, never change it.
        Events are fetched when you look and aren&apos;t stored.
      </p>

      {connected ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="flex items-center gap-2 text-sm">
            <CalendarDays className="size-4 text-success" aria-hidden />
            Connected{email ? ` as ${email}` : ""}
          </p>
          {confirming ? (
            <span className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await disconnectCalendar();
                    setConfirming(false);
                  })
                }
              >
                {pending ? "Disconnecting…" : "Disconnect"}
              </Button>
            </span>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
              Disconnect
            </Button>
          )}
        </div>
      ) : available ? (
        // A plain link: the route sends the browser on to Google.
        <a href="/api/calendar/connect" className={buttonVariants({ variant: "outline", className: "self-start" })}>
          <CalendarDays />
          Connect Google Calendar
        </a>
      ) : (
        <p className="text-sm text-muted-foreground">Google Calendar isn&apos;t set up on this server yet.</p>
      )}

      {message && !(message.ok && !connected) && (
        <p role={message.ok ? "status" : "alert"} className={message.ok ? "text-sm text-success" : "text-sm text-destructive"}>
          {message.text}
        </p>
      )}
      {connected && (
        <p className="text-xs text-muted-foreground">
          Disconnecting removes Compound&apos;s access at Google and deletes the stored connection.
        </p>
      )}
    </div>
  );
}
