import "server-only";
import { db } from "@/lib/db";
import type { CalendarDate, MoneyKind } from "@/lib/db/types";
import { DEFAULT_CATEGORIES } from "./categories";
import { monthRange, summarize, type Month } from "./summary";

export type MoneyCategory = { id: string; kind: MoneyKind; name: string; icon: string };

/**
 * The user's active categories. The first time, it copies in the default
 * ones (doing nothing if another request already did, thanks to the unique
 * index on name).
 */
export async function getCategories(userId: string): Promise<MoneyCategory[]> {
  const load = () =>
    db
      .selectFrom("money_categories")
      .select(["id", "kind", "name", "icon"])
      .where("user_id", "=", userId)
      .where("archived_at", "is", null)
      .orderBy("kind")
      .orderBy("position")
      .execute();

  const categories = await load();
  if (categories.length > 0) return categories;

  const defaults = (["expense", "income"] as const).flatMap((kind) =>
    DEFAULT_CATEGORIES[kind].map((c, i) => ({ user_id: userId, kind, name: c.name, icon: c.icon, position: i + 1 })),
  );
  await db
    .insertInto("money_categories")
    .values(defaults)
    .onConflict((oc) => oc.doNothing())
    .execute();
  return load();
}

export type TransactionItem = {
  id: string;
  kind: MoneyKind;
  amountCents: number;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  note: string | null;
  occurredOn: CalendarDate;
  goalId: string | null;
  goalTitle: string | null;
};

/** A month's transactions (newest first) and its totals. */
export async function getMonth(userId: string, month: Month) {
  const { start, end } = monthRange(month);
  const rows = await db
    .selectFrom("transactions")
    .innerJoin("money_categories", "money_categories.id", "transactions.category_id")
    .leftJoin("goals", "goals.id", "transactions.goal_id")
    .select([
      "transactions.id",
      "transactions.kind",
      "transactions.amount_cents",
      "transactions.category_id",
      "transactions.note",
      "transactions.occurred_on",
      "money_categories.name as category_name",
      "money_categories.icon as category_icon",
      "transactions.goal_id",
      "goals.title as goal_title",
    ])
    .where("transactions.user_id", "=", userId)
    .where("transactions.occurred_on", ">=", start)
    .where("transactions.occurred_on", "<=", end)
    .orderBy("transactions.occurred_on", "desc")
    .orderBy("transactions.created_at", "desc")
    .execute();

  const items: TransactionItem[] = rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    amountCents: r.amount_cents,
    categoryId: r.category_id,
    categoryName: r.category_name,
    categoryIcon: r.category_icon,
    note: r.note,
    occurredOn: r.occurred_on,
    goalId: r.goal_id,
    goalTitle: r.goal_title,
  }));
  return { items, summary: summarize(items) };
}

/** What the user spent on one day (for the Today card). */
export async function spentOn(userId: string, date: CalendarDate): Promise<number> {
  const row = await db
    .selectFrom("transactions")
    .select((eb) => eb.fn.sum<string>("amount_cents").as("total"))
    .where("user_id", "=", userId)
    .where("kind", "=", "expense")
    .where("occurred_on", "=", date)
    .executeTakeFirstOrThrow();
  return Number(row.total ?? 0);
}
