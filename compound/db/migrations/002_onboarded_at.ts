import type { Kysely } from "kysely";

// null until the user finishes onboarding.
export async function up(db: Kysely<unknown>) {
  await db.schema.alterTable("users").addColumn("onboarded_at", "timestamptz").execute();
}

export async function down(db: Kysely<unknown>) {
  await db.schema.alterTable("users").dropColumn("onboarded_at").execute();
}
