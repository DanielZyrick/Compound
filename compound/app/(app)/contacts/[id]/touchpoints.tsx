"use client";

import { useState, useTransition } from "react";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatShortDate } from "@/lib/dates/calendar";
import { NEXT_FOLLOW_UP_LABELS, NEXT_FOLLOW_UPS } from "@/lib/contacts/follow-up";
import type { Touchpoint } from "@/lib/contacts/queries";
import { cn } from "@/lib/utils";
import { MAX_TOUCHPOINT_NOTE } from "@/lib/validation/contacts";
import { deleteTouchpoint, logTouchpoint } from "../actions";

type Choice = (typeof NEXT_FOLLOW_UPS)[number] | "date";

/** Logging that you were in touch, and the history of touchpoints. */
export function Touchpoints({
  contactId,
  name,
  touchpoints,
  today,
}: {
  contactId: string;
  name: string;
  touchpoints: Touchpoint[];
  today: string;
}) {
  const [open, setOpen] = useState(false);
  const [happenedOn, setHappenedOn] = useState(today);
  const [note, setNote] = useState("");
  const [choice, setChoice] = useState<Choice>("2w");
  const [date, setDate] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  function reset() {
    setOpen(false);
    setHappenedOn(today);
    setNote("");
    setChoice("2w");
    setDate("");
    setErrors([]);
  }

  return (
    <section aria-labelledby="touchpoints-heading" className="mt-8">
      <div className="flex items-center justify-between gap-3">
        <h2 id="touchpoints-heading" className="font-semibold">
          Touchpoints
        </h2>
        {!open && (
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            <MessageCircle />
            Log a touchpoint
          </Button>
        )}
      </div>

      {open && (
        <form
          noValidate
          className="mt-3 flex flex-col gap-4 rounded-2xl border p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (choice === "date" && !date) {
              setErrors(["Choose the follow-up date, or pick another option."]);
              return;
            }
            startTransition(async () => {
              const result = await logTouchpoint({
                contactId,
                happenedOn,
                note,
                next: choice === "date" ? date : choice,
              });
              setErrors(result.errors);
              if (result.errors.length === 0) reset();
            });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="touchpoint-date">When</Label>
              <Input
                id="touchpoint-date"
                type="date"
                value={happenedOn}
                max={today}
                onChange={(e) => setHappenedOn(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="touchpoint-note">What happened (optional)</Label>
              <Input
                id="touchpoint-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={MAX_TOUCHPOINT_NOTE}
                placeholder="e.g. Coffee chat, sent my portfolio"
                className="h-10"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <p id="next-follow-up" className="text-sm font-medium">
              Follow up with {name} next
            </p>
            <div role="radiogroup" aria-labelledby="next-follow-up" className="flex flex-wrap gap-2">
              {([...NEXT_FOLLOW_UPS.filter((c) => c !== "none"), "date", "none"] as Choice[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={choice === c}
                  onClick={() => setChoice(c)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    choice === c ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                  )}
                >
                  {c === "date" ? "Pick a date" : c === "none" ? "No follow-up" : NEXT_FOLLOW_UP_LABELS[c]}
                </button>
              ))}
            </div>
            {choice === "date" && (
              <Input
                type="date"
                aria-label="Follow-up date"
                value={date}
                min={today}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 h-10 w-fit"
              />
            )}
          </div>

          {errors.length > 0 && (
            <p role="alert" className="text-sm text-destructive">
              {errors.join(" ")}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={reset}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save touchpoint"}
            </Button>
          </div>
        </form>
      )}

      {touchpoints.length === 0 ? (
        !open && <p className="mt-3 text-sm text-muted-foreground">No touchpoints yet.</p>
      ) : (
        <ol className="mt-3 flex flex-col gap-2">
          {touchpoints.map((t) => (
            <li key={t.id} className="group flex items-start gap-3 rounded-xl border px-4 py-2.5 text-sm">
              <span className="w-16 shrink-0 text-muted-foreground tabular-nums">
                {formatShortDate(t.happened_on, today.slice(0, 4))}
              </span>
              <span className="min-w-0 flex-1 break-words">
                {t.note ?? <span className="text-muted-foreground">Got in touch</span>}
              </span>
              <button
                type="button"
                aria-label={`Remove the touchpoint from ${formatShortDate(t.happened_on, today.slice(0, 4))}`}
                onClick={() => startTransition(async () => void (await deleteTouchpoint({ id: t.id })))}
                className="rounded p-0.5 text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
