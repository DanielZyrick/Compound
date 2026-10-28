import { addDays } from "@/lib/dates/calendar";
import type { CalendarDate, MoneyKind } from "@/lib/db/types";

// Monthly totals and day groups for the Money page. Pure functions over
// plain rows; all amounts are integer cents.

export type MoneyRow = {
  id: string;
  kind: MoneyKind;
  amountCents: number;
  categoryId: string;
  occurredOn: CalendarDate;
};

/** A calendar month as "YYYY-MM". */
export type Month = string;

export function monthOf(date: CalendarDate): Month {
  return date.slice(0, 7);
}

/** The first and last day of a month. */
export function monthRange(month: Month): { start: CalendarDate; end: CalendarDate } {
  const start = `${month}-01`;
  const next = shiftMonth(month, 1);
  return { start, end: addDays(`${next}-01`, -1) };
}

/** The month `by` months later (negative: earlier). */
export function shiftMonth(month: Month, by: number): Month {
  const [year, m] = month.split("-").map(Number);
  const index = year * 12 + (m - 1) + by;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/** "October 2026" */
export function formatMonth(month: Month): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${month}-01T00:00:00Z`),
  );
}

export type CategoryShare = { categoryId: string; cents: number; share: number };

/**
 * Totals for a set of transactions: spent, income, what's left, and spending
 * by category, biggest first. Shares add up to 1 (before rounding for display).
 */
export function summarize(rows: MoneyRow[]) {
  let spent = 0;
  let income = 0;
  const byCategory = new Map<string, number>();
  for (const row of rows) {
    if (row.kind === "income") {
      income += row.amountCents;
    } else {
      spent += row.amountCents;
      byCategory.set(row.categoryId, (byCategory.get(row.categoryId) ?? 0) + row.amountCents);
    }
  }
  const categories: CategoryShare[] = [...byCategory.entries()]
    .map(([categoryId, cents]) => ({ categoryId, cents, share: spent > 0 ? cents / spent : 0 }))
    .sort((a, b) => b.cents - a.cents);
  return { spent, income, left: income - spent, categories };
}

export type DayGroup<T extends MoneyRow> = { date: CalendarDate; spent: number; income: number; items: T[] };

/** Transactions grouped by day, newest day first, in the order given within a day. */
export function groupByDay<T extends MoneyRow>(rows: T[]): DayGroup<T>[] {
  const groups = new Map<CalendarDate, DayGroup<T>>();
  for (const row of rows) {
    const group = groups.get(row.occurredOn) ?? { date: row.occurredOn, spent: 0, income: 0, items: [] };
    group.items.push(row);
    if (row.kind === "income") group.income += row.amountCents;
    else group.spent += row.amountCents;
    groups.set(row.occurredOn, group);
  }
  return [...groups.values()].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/** "Today", "Yesterday", or the date. */
export function dayLabel(date: CalendarDate, today: CalendarDate, format: (d: CalendarDate) => string): string {
  if (date === today) return "Today";
  if (date === addDays(today, -1)) return "Yesterday";
  return format(date);
}
