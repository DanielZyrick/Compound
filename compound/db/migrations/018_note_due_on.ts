import type { Kysely } from "kysely";

// Due dates on notes: an optional calendar date a to-do should be done by.
export async function up(db: Kysely<unknown>) {
  await db.schema.alterTable("notes").addColumn("due_on", "date").execute();
}

export async function down(db: Kysely<unknown>) {
  await db.schema.alterTable("notes").dropColumn("due_on").execute();
}
