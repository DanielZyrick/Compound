import type { CalendarDate } from "@/lib/db/types";
import { monthRange, type Month } from "./summary";

// Monthly budgets: how much of a budget is spent, what's left, and whether
// spending is ahead of the month. Pure functions over integer cents.

/** Past this share of a budget, the bar turns amber. */
export const WARN_AT = 0.8;
/** Spending this much further through the budget than through the month counts as fast. */
const FAST_MARGIN = 0.1;

export type Pace = "on-pace" | "fast" | "over";

export type BudgetStatus = {
  spent: number;
  budget: number;
  /** Budget minus spent; negative when over. */
  left: number;
  /** Share of the budget spent: 0.5 is half, above 1 is over. */
  used: number;
  tone: "ok" | "warn" | "over";
  pace: Pace;
};

/**
 * How much of a month has gone by on `today`, from 0 to 1. The whole of the
 * day counts, so the last day of the month is 1. Past months are 1; future
 * months are 0.
 */
export function monthElapsed(month: Month, today: CalendarDate): number {
  const { start, end } = monthRange(month);
  if (today > end) return 1;
  if (today < start) return 0;
  return Number(today.slice(8, 10)) / Number(end.slice(8, 10));
}

export function budgetStatus(spent: number, budget: number, elapsed: number): BudgetStatus {
  const used = spent / budget;
  const left = budget - spent;
  const tone = used > 1 ? "over" : used >= WARN_AT ? "warn" : "ok";
  const pace: Pace = used > 1 ? "over" : used - elapsed > FAST_MARGIN ? "fast" : "on-pace";
  return { spent, budget, left, used, tone, pace };
}

export const PACE_LABELS: Record<Pace, string> = { "on-pace": "On pace", fast: "Spending fast", over: "Over budget" };

/**
 * All budgets together: the total budgeted and what was spent in those
 * categories only (spending in categories without a budget isn't counted).
 * Null when no category has a budget.
 */
export function totalBudget(
  categories: { id: string; budgetCents: number | null }[],
  spentByCategory: Map<string, number>,
  elapsed: number,
): BudgetStatus | null {
  let budget = 0;
  let spent = 0;
  for (const c of categories) {
    if (c.budgetCents === null) continue;
    budget += c.budgetCents;
    spent += spentByCategory.get(c.id) ?? 0;
  }
  return budget > 0 ? budgetStatus(spent, budget, elapsed) : null;
}
