import { sql, type Kysely } from "kysely";

// Notes: quick notes and to-dos. A note can be ticked off (done_at) and
// pinned to the top.
export async function up(db: Kysely<unknown>) {
  await db.schema
    .createTable("notes")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("user_id", "uuid", (col) => col.notNull().references("users.id").onDelete("cascade"))
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("body", "text")
    .addColumn("pinned", "boolean", (col) => col.notNull().defaultTo(false))
    .addColumn("done_at", "timestamptz")
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addCheckConstraint("notes_title_check", sql`char_length(title) between 1 and 120`)
    .addCheckConstraint("notes_body_check", sql`body is null or char_length(body) <= 5000`)
    .execute();

  await db.schema.createIndex("notes_user_id_index").on("notes").column("user_id").execute();
}

export async function down(db: Kysely<unknown>) {
  await db.schema.dropTable("notes").execute();
}
