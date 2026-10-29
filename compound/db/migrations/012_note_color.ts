import { sql, type Kysely } from "kysely";

// Notes look like sticky notes: each has a paper colour, yellow by default.
export async function up(db: Kysely<unknown>) {
  await db.schema
    .alterTable("notes")
    .addColumn("color", "text", (col) => col.notNull().defaultTo("yellow"))
    .execute();
  await db.schema
    .alterTable("notes")
    .addCheckConstraint("notes_color_check", sql`color in ('yellow', 'pink', 'blue', 'green', 'orange')`)
    .execute();
}

export async function down(db: Kysely<unknown>) {
  await db.schema.alterTable("notes").dropColumn("color").execute();
}
