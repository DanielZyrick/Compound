import Link from "next/link";
import { CategoryIcon } from "@/components/money/category-icon";
import { formatMoney } from "@/lib/money/amount";
import { budgetStatus, PACE_LABELS, totalBudget, type BudgetStatus } from "@/lib/money/budget";
import type { MoneyCategory } from "@/lib/money/queries";
import { cn } from "@/lib/utils";

const BAR_TONE: Record<BudgetStatus["tone"], string> = {
  ok: "bg-primary",
  warn: "bg-chart-3",
  over: "bg-destructive",
};

/**
 * Spending by category for one month. Categories with a budget show how much
 * of it is used and what's left; the rest show their share of all spending.
 * Budgeted categories with nothing spent yet are listed too.
 */
export function SpendingByCategory({
  spent,
  spentByCategory,
  categoryById,
  budgeted,
  elapsed,
  pastMonth,
  currency,
}: {
  spent: number;
  spentByCategory: Map<string, number>;
  categoryById: Map<string, MoneyCategory>;
  /** Active expense categories with a budget. */
  budgeted: MoneyCategory[];
  /** How much of the month has gone by, 0 to 1. */
  elapsed: number;
  pastMonth: boolean;
  currency: string;
}) {
  const ids = [...spentByCategory.keys()];
  for (const c of budgeted) if (!spentByCategory.has(c.id)) ids.push(c.id);
  const total = totalBudget(budgeted, spentByCategory, elapsed);

  if (ids.length === 0) return null;

  return (
    <div className="mt-4 rounded-xl border p-4">
      {total && <BudgetSummary total={total} currency={currency} pastMonth={pastMonth} />}

      <h3 className="text-sm font-medium">Spending by category</h3>
      <ul className="mt-3 flex flex-col gap-3">
        {ids.map((id) => {
          const category = categoryById.get(id);
          const cents = spentByCategory.get(id) ?? 0;
          const budget = category?.budgetCents ?? null;
          const status = budget !== null ? budgetStatus(cents, budget, elapsed) : null;
          const percent = status ? Math.round(status.used * 100) : spent > 0 ? Math.round((cents / spent) * 100) : 0;
          return (
            <li key={id} aria-label={category?.name ?? "Other"}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <CategoryIcon icon={category?.icon ?? "other"} className="shrink-0 text-muted-foreground" />
                  <span className="truncate">{category?.name ?? "Other"}</span>
                </span>
                <span className="shrink-0 tabular-nums">
                  {formatMoney(cents, currency)}{" "}
                  <span className="text-muted-foreground">
                    {status ? `of ${formatMoney(status.budget, currency)}` : `· ${percent}%`}
                  </span>
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden>
                <div
                  className={cn("h-full rounded-full", status ? BAR_TONE[status.tone] : "bg-primary")}
                  style={{ width: `${Math.min(Math.max(percent, cents > 0 ? 1 : 0), 100)}%` }}
                />
              </div>
              {status && (
                <p
                  className={cn(
                    "mt-1 text-xs tabular-nums",
                    status.tone === "over" ? "font-medium text-destructive" : "text-muted-foreground",
                  )}
                >
                  {status.left < 0
                    ? `${formatMoney(-status.left, currency)} over`
                    : `${formatMoney(status.left, currency)} left`}
                  {status.tone === "warn" && " · almost there"}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      {budgeted.length === 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Want a limit?{" "}
          <Link href="/money/categories" className="text-primary hover:underline">
            Set a monthly budget
          </Link>{" "}
          on any expense category.
        </p>
      )}
    </div>
  );
}

/** All budgets together: used, left, and whether spending is ahead of the month. */
function BudgetSummary({ total, currency, pastMonth }: { total: BudgetStatus; currency: string; pastMonth: boolean }) {
  const percent = Math.round(total.used * 100);
  return (
    <section aria-label="Budget" className="mb-5 border-b pb-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="text-sm font-medium">Budget</h3>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            total.pace === "over"
              ? "bg-destructive/10 text-destructive"
              : total.pace === "fast"
                ? "bg-chart-3/15 text-foreground"
                : "bg-success/10 text-success",
          )}
        >
          {PACE_LABELS[total.pace]}
        </span>
      </div>
      <p className="mt-1 text-lg font-semibold tabular-nums">
        {total.left < 0 ? `${formatMoney(-total.left, currency)} over` : `${formatMoney(total.left, currency)} left`}
        <span className="ml-2 text-sm font-normal text-muted-foreground">
          {formatMoney(total.spent, currency)} of {formatMoney(total.budget, currency)}
        </span>
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary" aria-hidden>
        <div className={cn("h-full rounded-full", BAR_TONE[total.tone])} style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
      {pastMonth && <p className="mt-2 text-xs text-muted-foreground">Compared with your current budgets.</p>}
    </section>
  );
}
