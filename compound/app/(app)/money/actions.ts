"use server";

import { refresh } from "next/cache";
import { requireOnboardedUser } from "@/lib/auth/dal";
import { todayIn } from "@/lib/dates/calendar";
import { db } from "@/lib/db";
import { deleteTransactionSchema, occurredOnError, transactionSchema } from "@/lib/validation/money";

export type MoneyActionResult = { errors: string[] };

const SOMETHING_WRONG = "Something went wrong. Please refresh and try again.";

/** Adds a transaction, or edits one when `id` is given. */
export async function saveTransaction(input: unknown): Promise<MoneyActionResult> {
  const user = await requireOnboardedUser();
  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) return { errors: [...new Set(parsed.error.issues.map((i) => i.message))] };
  const { id, kind, amount, categoryId, note, occurredOn, goalId } = parsed.data;

  const dateProblem = occurredOnError(todayIn(user.timezone), occurredOn);
  if (dateProblem) return { errors: [dateProblem] };

  // The category must be the user's own and match the kind (no "Salary" expense).
  const category = await db
    .selectFrom("money_categories")
    .select(["id", "archived_at"])
    .where("id", "=", categoryId)
    .where("user_id", "=", user.id)
    .where("kind", "=", kind)
    .executeTakeFirst();
  // An archived category can stay on an old transaction being edited, but
  // isn't offered for new ones.
  if (!category || (category.archived_at && !id)) return { errors: ["Choose a category."] };

  // Only income can go toward a goal, and only the user's own goal with a
  // savings target. Completed goals are allowed so old entries stay
  // editable; archived ones aren't. Expenses never carry a goal.
  if (goalId && kind === "income") {
    const goal = await db
      .selectFrom("goals")
      .select("id")
      .where("id", "=", goalId)
      .where("user_id", "=", user.id)
      .where("status", "!=", "archived")
      .where("target_cents", "is not", null)
      .executeTakeFirst();
    if (!goal) return { errors: ["Choose one of your goals with a savings target."] };
  }

  const values = {
    kind,
    amount_cents: amount,
    category_id: categoryId,
    note,
    occurred_on: occurredOn,
    goal_id: kind === "income" ? (goalId ?? null) : null,
  };
  if (id) {
    const updated = await db
      .updateTable("transactions")
      .set(values)
      .where("id", "=", id)
      .where("user_id", "=", user.id)
      .executeTakeFirst();
    if (updated.numUpdatedRows === BigInt(0)) return { errors: [SOMETHING_WRONG] };
  } else {
    await db.insertInto("transactions").values({ ...values, user_id: user.id }).execute();
  }

  refresh();
  return { errors: [] };
}

export async function deleteTransaction(input: unknown): Promise<MoneyActionResult> {
  const user = await requireOnboardedUser();
  const parsed = deleteTransactionSchema.safeParse(input);
  if (!parsed.success) return { errors: [SOMETHING_WRONG] };

  await db
    .deleteFrom("transactions")
    .where("id", "=", parsed.data.id)
    .where("user_id", "=", user.id)
    .execute();
  refresh();
  return { errors: [] };
}
