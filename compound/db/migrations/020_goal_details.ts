import type { Kysely } from "kysely";

// Goal details: optional specifics on a goal (what done looks like, what the
// user already has, limits like budget or tools). Passed to the AI plan.
export async function up(db: Kysely<unknown>) {
  await db.schema.alterTable("goals").addColumn("details", "text").execute();
}

export async function down(db: Kysely<unknown>) {
  await db.schema.alterTable("goals").dropColumn("details").execute();
}
