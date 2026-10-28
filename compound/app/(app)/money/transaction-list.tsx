"use client";

import { useState } from "react";
import { CategoryIcon } from "@/components/money/category-icon";
import { formatShortDate } from "@/lib/dates/calendar";
import type { CalendarDate } from "@/lib/db/types";
import { formatMoney } from "@/lib/money/amount";
import type { MoneyCategory, TransactionItem } from "@/lib/money/queries";
import { dayLabel, groupByDay } from "@/lib/money/summary";
import { cn } from "@/lib/utils";
import { TransactionForm, type SavingsGoal } from "./transaction-form";

type Props = {
  items: TransactionItem[];
  categories: MoneyCategory[];
  currency: string;
  today: CalendarDate;
  savingsGoals: SavingsGoal[];
};

/** Every transaction of the month, by day. Tap one to edit or delete it. */
export function TransactionList({ items, categories, currency, today, savingsGoals }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const groups = groupByDay(items);
  const year = today.slice(0, 4);

  if (groups.length === 0) {
    return <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">Nothing recorded this month yet.</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <section key={group.date}>
          <div className="mb-2 flex items-baseline justify-between gap-3 text-sm">
            <h3 className="font-medium">{dayLabel(group.date, today, (d) => formatShortDate(d, year))}</h3>
            <p className="text-muted-foreground tabular-nums">
              {group.spent > 0 && <>−{formatMoney(group.spent, currency)}</>}
              {group.spent > 0 && group.income > 0 && " · "}
              {group.income > 0 && <span className="text-success">+{formatMoney(group.income, currency)}</span>}
            </p>
          </div>
          <ul className="divide-y rounded-xl border">
            {group.items.map((item) => (
              <li key={item.id}>
                {editing === item.id ? (
                  <div className="p-4">
                    <TransactionForm
                      categories={categories}
                      currency={currency}
                      today={today}
                      savingsGoals={savingsGoals}
                      existing={item}
                      autoFocus
                      onDone={() => setEditing(null)}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditing(item.id)}
                    aria-label={`Edit ${item.categoryName} ${formatMoney(item.amountCents, currency)}`}
                    className="flex w-full items-center gap-3 p-3 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted">
                      <CategoryIcon icon={item.categoryIcon} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{item.categoryName}</span>
                      {item.note && <span className="block truncate text-sm text-muted-foreground">{item.note}</span>}
                      {item.goalTitle && (
                        <span className="block truncate text-xs text-primary">Saved toward {item.goalTitle}</span>
                      )}
                    </span>
                    <span
                      className={cn("shrink-0 font-medium tabular-nums", item.kind === "income" && "text-success")}
                    >
                      {item.kind === "income" ? "+" : "−"}
                      {formatMoney(item.amountCents, currency)}
                    </span>
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
