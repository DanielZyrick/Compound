"use server";

import { refresh } from "next/cache";
import { sql } from "kysely";
import { requireOnboardedUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import type { MoneyKind } from "@/lib/db/types";
import {
  archiveCategorySchema,
  MAX_CATEGORIES_PER_KIND,
  newCategorySchema,
  updateCategorySchema,
} from "@/lib/validation/money";

export type CategoryActionResult = { errors: string[] };

const SOMETHING_WRONG = "Something went wrong. Please refresh and try again.";
const messages = (issues: { message: string }[]) => [...new Set(issues.map((i) => i.message))];

/** Is the name already used by another category of this kind? Case doesn't matter. */
async function nameTaken(userId: string, kind: MoneyKind, name: string, exceptId?: string) {
  let query = db
    .selectFrom("money_categories")
    .select("id")
    .where("user_id", "=", userId)
    .where("kind", "=", kind)
    .where(sql<string>`lower(name)`, "=", name.toLowerCase());
  if (exceptId) query = query.where("id", "!=", exceptId);
  return (await query.executeTakeFirst()) !== undefined;
}

export async function addCategory(input: unknown): Promise<CategoryActionResult> {
  const user = await requireOnboardedUser();
  const parsed = newCategorySchema.safeParse(input);
  if (!parsed.success) return { errors: messages(parsed.error.issues) };
  const { kind, name, icon } = parsed.data;

  const existing = await db
    .selectFrom("money_categories")
    .select((eb) => [eb.fn.countAll<string>().as("count"), eb.fn.max("position").as("last")])
    .where("user_id", "=", user.id)
    .where("kind", "=", kind)
    .where("archived_at", "is", null)
    .executeTakeFirstOrThrow();
  if (Number(existing.count) >= MAX_CATEGORIES_PER_KIND) {
    return { errors: [`You can have up to ${MAX_CATEGORIES_PER_KIND} ${kind} categories. Archive one first.`] };
  }
  if (await nameTaken(user.id, kind, name)) {
    return { errors: [`You already have a category called "${name}". Restore or rename it instead.`] };
  }

  await db
    .insertInto("money_categories")
    .values({ user_id: user.id, kind, name, icon, position: (existing.last ?? 0) + 1 })
    .execute();
  refresh();
  return { errors: [] };
}

export async function updateCategory(input: unknown): Promise<CategoryActionResult> {
  const user = await requireOnboardedUser();
  const parsed = updateCategorySchema.safeParse(input);
  if (!parsed.success) return { errors: messages(parsed.error.issues) };
  const { id, name, icon } = parsed.data;

  const category = await db
    .selectFrom("money_categories")
    .select("kind")
    .where("id", "=", id)
    .where("user_id", "=", user.id)
    .executeTakeFirst();
  if (!category) return { errors: [SOMETHING_WRONG] };
  if (await nameTaken(user.id, category.kind, name, id)) {
    return { errors: [`You already have a category called "${name}".`] };
  }

  await db.updateTable("money_categories").set({ name, icon }).where("id", "=", id).execute();
  refresh();
  return { errors: [] };
}

/**
 * Archives a category (it's no longer offered when adding, but old
 * transactions keep it) or restores it. The last active category of a kind
 * can't be archived: adding a transaction always needs one.
 */
export async function setCategoryArchived(input: unknown): Promise<CategoryActionResult> {
  const user = await requireOnboardedUser();
  const parsed = archiveCategorySchema.safeParse(input);
  if (!parsed.success) return { errors: [SOMETHING_WRONG] };
  const { id, archived } = parsed.data;

  const category = await db
    .selectFrom("money_categories")
    .select(["kind", "archived_at"])
    .where("id", "=", id)
    .where("user_id", "=", user.id)
    .executeTakeFirst();
  if (!category) return { errors: [SOMETHING_WRONG] };

  const active = await db
    .selectFrom("money_categories")
    .select((eb) => eb.fn.countAll<string>().as("count"))
    .where("user_id", "=", user.id)
    .where("kind", "=", category.kind)
    .where("archived_at", "is", null)
    .executeTakeFirstOrThrow();
  if (archived && category.archived_at === null && Number(active.count) <= 1) {
    return { errors: [`Keep at least one ${category.kind} category.`] };
  }
  if (!archived && category.archived_at !== null && Number(active.count) >= MAX_CATEGORIES_PER_KIND) {
    return { errors: [`You can have up to ${MAX_CATEGORIES_PER_KIND} ${category.kind} categories. Archive one first.`] };
  }

  await db
    .updateTable("money_categories")
    .set({ archived_at: archived ? new Date() : null })
    .where("id", "=", id)
    .execute();
  refresh();
  return { errors: [] };
}
