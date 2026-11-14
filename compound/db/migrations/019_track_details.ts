import type { Kysely } from "kysely";

// Track details: optional, more specific notes on what the learner wants from
// a skill or thinking track. Passed to the AI for the plan and every lesson.
export async function up(db: Kysely<unknown>) {
  await db.schema.alterTable("tracks").addColumn("details", "text").execute();
}

export async function down(db: Kysely<unknown>) {
  await db.schema.alterTable("tracks").dropColumn("details").execute();
}
