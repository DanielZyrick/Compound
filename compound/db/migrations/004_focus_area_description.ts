import type { Kysely } from "kysely";

// What the user wants to achieve, in their own words. The AI features use it
// as context. Nullable because rows created before this migration have none;
// the onboarding form requires it.
export async function up(db: Kysely<unknown>) {
  await db.schema.alterTable("focus_areas").addColumn("description", "text").execute();
}

export async function down(db: Kysely<unknown>) {
  await db.schema.alterTable("focus_areas").dropColumn("description").execute();
}
