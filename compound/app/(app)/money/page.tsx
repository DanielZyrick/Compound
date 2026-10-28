import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CategoryIcon } from "@/components/money/category-icon";
import { buttonVariants } from "@/components/ui/button";
import { requireOnboardedUser } from "@/lib/auth/dal";
import { todayIn } from "@/lib/dates/calendar";
import { formatMoney } from "@/lib/money/amount";
import { getSavingsGoals } from "@/lib/goals/queries";
import { getCategories, getMonth } from "@/lib/money/queries";
import { formatMonth, monthOf, shiftMonth } from "@/lib/money/summary";
import { cn } from "@/lib/utils";
import { TransactionForm } from "./transaction-form";
import { TransactionList } from "./transaction-list";

export const metadata: Metadata = { title: "Money" };

export default function MoneyPage({ searchParams }: PageProps<"/money">) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-8 md:py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Money</h1>
      <p className="mt-1 text-muted-foreground">Every peso, written down. Small leaks add up too.</p>
      <Suspense fallback={<div aria-hidden className="mt-8 h-96 animate-pulse rounded-2xl bg-muted" />}>
        <MoneyContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function MoneyContent({ searchParams }: Pick<PageProps<"/money">, "searchParams">) {
  const params = await searchParams;
  const user = await requireOnboardedUser();
  const today = todayIn(user.timezone);
  const thisMonth = monthOf(today);
  // ?month=YYYY-MM, never in the future; anything else shows this month.
  const asked = typeof params.month === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month) ? params.month : null;
  const month = asked && asked <= thisMonth ? asked : thisMonth;
  const kind = params.add === "income" ? "income" : "expense";

  const [categories, { items, summary }, savingsGoals] = await Promise.all([
    getCategories(user.id),
    getMonth(user.id, month),
    getSavingsGoals(user.id),
  ]);
  const currency = user.currency;
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  // Categories that only appear on old transactions (archived) still need a name.
  for (const item of items) {
    if (!categoryById.has(item.categoryId)) {
      categoryById.set(item.categoryId, { id: item.categoryId, kind: item.kind, name: item.categoryName, icon: item.categoryIcon });
    }
  }

  return (
    <div className="mt-8 flex flex-col gap-8">
      <section id="quick-add" className="scroll-mt-20 rounded-2xl border p-5 shadow-card">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="font-semibold">Add</h2>
          <Link href="/money/categories" className="text-sm text-primary hover:underline">
            Manage categories
          </Link>
        </div>
        <TransactionForm
          key={kind}
          categories={categories}
          currency={currency}
          today={today}
          initialKind={kind}
          savingsGoals={savingsGoals}
          autoFocus={params.add !== undefined}
        />
      </section>

      <section>
        <div className="flex items-center justify-between gap-3">
          <Link
            href={`/money?month=${shiftMonth(month, -1)}`}
            aria-label="Previous month"
            className={buttonVariants({ variant: "ghost", size: "icon" })}
          >
            <ChevronLeft />
          </Link>
          <h2 className="text-lg font-semibold">{formatMonth(month)}</h2>
          {month < thisMonth ? (
            <Link
              href={`/money?month=${shiftMonth(month, 1)}`}
              aria-label="Next month"
              className={buttonVariants({ variant: "ghost", size: "icon" })}
            >
              <ChevronRight />
            </Link>
          ) : (
            <span className="size-8" />
          )}
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-3">
          <Tile label="Spent" value={formatMoney(summary.spent, currency)} />
          <Tile label="Income" value={formatMoney(summary.income, currency)} />
          <Tile
            label={summary.left < 0 ? "Over by" : "Left"}
            value={formatMoney(Math.abs(summary.left), currency)}
            tone={summary.left < 0 ? "text-destructive" : undefined}
          />
        </dl>

        {summary.categories.length > 0 && (
          <div className="mt-4 rounded-xl border p-4">
            <h3 className="text-sm font-medium">Spending by category</h3>
            <ul className="mt-3 flex flex-col gap-3">
              {summary.categories.map((c) => {
                const category = categoryById.get(c.categoryId);
                const percent = Math.round(c.share * 100);
                return (
                  <li key={c.categoryId}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2">
                        <CategoryIcon icon={category?.icon ?? "other"} className="text-muted-foreground" />
                        {category?.name ?? "Other"}
                      </span>
                      <span className="tabular-nums">
                        {formatMoney(c.cents, currency)} <span className="text-muted-foreground">· {percent}%</span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden>
                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(percent, 1)}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Transactions</h2>
        <TransactionList
          items={items}
          categories={categories}
          currency={currency}
          today={today}
          savingsGoals={savingsGoals}
        />
      </section>
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("mt-1 truncate text-base font-semibold tabular-nums sm:text-lg", tone)}>{value}</dd>
    </div>
  );
}
