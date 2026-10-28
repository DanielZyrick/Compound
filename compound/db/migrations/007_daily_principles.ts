import { sql, type Kysely } from "kysely";

// One principle of the day per user per date, generated once and kept, plus
// the user's written reflection on it.
export async function up(db: Kysely<unknown>) {
  await db.schema
    .createTable("daily_principles")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("user_id", "uuid", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("date", "date", (col) => col.notNull()) // the user's local date
    .addColumn("content", "jsonb", (col) => col.notNull()) // validated with Zod before saving
    .addColumn("source", "text", (col) => col.notNull())
    .addColumn("reflection", "text")
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addUniqueConstraint("daily_principles_user_id_date_unique", ["user_id", "date"])
    .addCheckConstraint("daily_principles_source_check", sql`source in ('ai', 'demo')`)
    .execute();
}

export async function down(db: Kysely<unknown>) {
  await db.schema.dropTable("daily_principles").execute();
}
