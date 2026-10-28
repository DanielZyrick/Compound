"use client";

import { useRef, useState, useTransition } from "react";
import { Check, Trash2 } from "lucide-react";
import { CategoryIcon } from "@/components/money/category-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CalendarDate, MoneyKind } from "@/lib/db/types";
import { centsToInput, formatMoney, parseAmount } from "@/lib/money/amount";
import type { MoneyCategory } from "@/lib/money/queries";
import { cn } from "@/lib/utils";
import { deleteTransaction, saveTransaction } from "./actions";

type Existing = {
  id: string;
  kind: MoneyKind;
  amountCents: number;
  categoryId: string;
  note: string | null;
  occurredOn: CalendarDate;
};

type Props = {
  categories: MoneyCategory[];
  currency: string;
  today: CalendarDate;
  /** Editing an existing transaction; leave out to add new ones. */
  existing?: Existing;
  initialKind?: MoneyKind;
  autoFocus?: boolean;
  onDone?: () => void;
};

/**
 * Add or edit a transaction. When adding, the form clears after each save
 * (keeping the date and kind) so several expenses can be logged in a row.
 */
export function TransactionForm({ categories, currency, today, existing, initialKind, autoFocus, onDone }: Props) {
  const [kind, setKind] = useState<MoneyKind>(existing?.kind ?? initialKind ?? "expense");
  const [amount, setAmount] = useState(existing ? centsToInput(existing.amountCents) : "");
  const [categoryId, setCategoryId] = useState<string | null>(existing?.categoryId ?? null);
  const [note, setNote] = useState(existing?.note ?? "");
  const [date, setDate] = useState<CalendarDate>(existing?.occurredOn ?? today);
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const amountRef = useRef<HTMLInputElement>(null);
  const idPrefix = existing ? `tx-${existing.id}` : "quick-add";

  const shown = categories.filter((c) => c.kind === kind || c.id === existing?.categoryId);
  const preview = parseAmount(amount);

  function switchKind(next: MoneyKind) {
    setKind(next);
    setCategoryId(null);
    setErrors([]);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setErrors([]);
    setSaved(null);
    if (!categoryId) return setErrors(["Choose a category."]);
    startTransition(async () => {
      const result = await saveTransaction({ id: existing?.id, kind, amount, categoryId, note, occurredOn: date });
      if (result.errors.length > 0) return setErrors(result.errors);
      if (existing) return onDone?.();
      // Ready for the next one: keep the kind and date, clear the rest.
      const name = categories.find((c) => c.id === categoryId)?.name ?? "";
      setSaved(`Saved ${formatMoney(preview ?? 0, currency)} · ${name}`);
      setAmount("");
      setNote("");
      setCategoryId(null);
      amountRef.current?.focus();
    });
  }

  function remove() {
    if (!existing) return;
    startTransition(async () => {
      const result = await deleteTransaction({ id: existing.id });
      if (result.errors.length > 0) setErrors(result.errors);
      else onDone?.();
    });
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {/* Expense or income: a two-option switch. */}
      <div role="radiogroup" aria-label="Type" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        {(["expense", "income"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => switchKind(k)}
            className={cn(
              "rounded-md py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              kind === k ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {k === "expense" ? "Expense" : "Income"}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-amount`}>Amount</Label>
        <Input
          ref={amountRef}
          id={`${idPrefix}-amount`}
          inputMode="decimal"
          autoComplete="off"
          autoFocus={autoFocus}
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setSaved(null);
          }}
          placeholder="0.00"
          className="h-12 text-2xl font-semibold tabular-nums md:text-2xl"
        />
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Category</legend>
        <div className="flex flex-wrap gap-2">
          {shown.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={categoryId === c.id}
              onClick={() => setCategoryId(c.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                categoryId === c.id ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted",
              )}
            >
              <CategoryIcon icon={c.icon} />
              {c.name}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-note`}>Note (optional)</Label>
          <Input
            id={`${idPrefix}-note`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={kind === "expense" ? "e.g. Lunch with the team" : "e.g. October salary"}
            maxLength={200}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-date`}>Date</Label>
          <Input
            id={`${idPrefix}-date`}
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
            className="sm:w-40"
          />
        </div>
      </div>

      {errors.length > 0 && (
        <p role="alert" className="text-sm text-destructive">
          {errors.join(" ")}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        {saved ? (
          <p role="status" className="flex items-center gap-1 text-sm text-success">
            <Check className="size-4" />
            {saved}
          </p>
        ) : existing ? (
          <Button type="button" variant="ghost" className="text-destructive" disabled={pending} onClick={remove}>
            <Trash2 />
            Delete
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          {existing && (
            <Button type="button" variant="ghost" onClick={onDone} disabled={pending}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={pending} className="h-10 px-5">
            {pending ? "Saving…" : existing ? "Save" : kind === "expense" ? "Add expense" : "Add income"}
          </Button>
        </div>
      </div>
    </form>
  );
}
