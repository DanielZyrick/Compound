import { sql, type Kysely } from "kysely";

// Money: income and expenses, the user's categories, their currency, and an
// optional savings target on goals. Amounts are whole cents (centavos), never
// decimals, so totals can't pick up rounding errors.
export async function up(db: Kysely<unknown>) {
  await db.schema
    .alterTable("users")
    .addColumn("currency", "text", (col) => col.notNull().defaultTo("PHP"))
    .execute();
  await db.schema
    .alterTable("users")
    .addCheckConstraint("users_currency_check", sql`currency ~ '^[A-Z]{3}$'`)
    .execute();

  await db.schema
    .createTable("money_categories")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("user_id", "uuid", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("kind", "text", (col) => col.notNull())
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("icon", "text", (col) => col.notNull()) // a key from lib/money/categories.ts
    .addColumn("position", "integer", (col) => col.notNull())
    // Archived categories keep their transactions but aren't offered any more.
    .addColumn("archived_at", "timestamptz")
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addCheckConstraint("money_categories_kind_check", sql`kind in ('expense', 'income')`)
    .execute();

  // One "Food" per user and kind, ignoring case.
  await sql`create unique index money_categories_user_kind_name_unique
    on money_categories (user_id, kind, lower(name))`.execute(db);

  await db.schema
    .createTable("transactions")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("user_id", "uuid", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("kind", "text", (col) => col.notNull())
    .addColumn("amount_cents", "integer", (col) => col.notNull())
    // Categories are archived, not deleted, so this always points somewhere.
    .addColumn("category_id", "uuid", (col) =>
      col.notNull().references("money_categories.id").onDelete("restrict"),
    )
    .addColumn("note", "text")
    .addColumn("occurred_on", "date", (col) => col.notNull()) // the user's local date
    // Money saved toward a goal. Kept (unlinked) if the goal is deleted.
    .addColumn("goal_id", "uuid", (col) => col.references("goals.id").onDelete("set null"))
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addCheckConstraint("transactions_kind_check", sql`kind in ('expense', 'income')`)
    // Up to 10,000,000.00 in one transaction.
    .addCheckConstraint("transactions_amount_check", sql`amount_cents between 1 and 1000000000`)
    .execute();

  await db.schema
    .createIndex("transactions_user_id_occurred_on_index")
    .on("transactions")
    .columns(["user_id", "occurred_on"])
    .execute();

  await db.schema.alterTable("goals").addColumn("target_cents", "integer").execute();
  await db.schema
    .alterTable("goals")
    .addCheckConstraint("goals_target_cents_check", sql`target_cents is null or target_cents between 1 and 1000000000`)
    .execute();
}

export async function down(db: Kysely<unknown>) {
  await db.schema.alterTable("goals").dropConstraint("goals_target_cents_check").execute();
  await db.schema.alterTable("goals").dropColumn("target_cents").execute();
  await db.schema.dropTable("transactions").execute();
  await db.schema.dropTable("money_categories").execute();
  await db.schema.alterTable("users").dropConstraint("users_currency_check").execute();
  await db.schema.alterTable("users").dropColumn("currency").execute();
}
