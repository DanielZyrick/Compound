import Link from "next/link";
import { Plus, Wallet } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { formatMoney } from "@/lib/money/amount";

/** Today's spending and a one-tap way to record an expense. */
export function MoneyToday({ spentCents, currency }: { spentCents: number; currency: string }) {
  return (
    <section className="flex items-center justify-between gap-3 rounded-2xl border p-5 shadow-card">
      <Link href="/money" className="flex min-w-0 items-center gap-3 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <Wallet className="size-5" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-sm text-muted-foreground">Spent today</span>
          <span className="block text-lg font-semibold tabular-nums">{formatMoney(spentCents, currency)}</span>
        </span>
      </Link>
      <Link href="/money?add=expense#quick-add" className={buttonVariants({ className: "shrink-0" })}>
        <Plus />
        Expense
      </Link>
    </section>
  );
}
