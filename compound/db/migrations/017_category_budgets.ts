import { sql, type Kysely } from "kysely";

// Monthly budgets: an optional amount per expense category, in cents, that
// applies every month until it's changed or removed.
export async function up(db: Kysely<unknown>) {
  await db.schema.alterTable("money_categories").addColumn("monthly_budget_cents", "integer").execute();
  await db.schema
    .alterTable("money_categories")
    .addCheckConstraint(
      "money_categories_budget_check",
      sql`monthly_budget_cents is null or (kind = 'expense' and monthly_budget_cents between 1 and 1000000000)`,
    )
    .execute();
}

export async function down(db: Kysely<unknown>) {
  await db.schema.alterTable("money_categories").dropConstraint("money_categories_budget_check").execute();
  await db.schema.alterTable("money_categories").dropColumn("monthly_budget_cents").execute();
}
