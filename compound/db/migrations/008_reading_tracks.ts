import { sql, type Kysely } from "kysely";

// Reading tracks (fixed plans such as the Gospel of John in 21 days) and the
// learner's reflections. Reading tracks have no level, and their plan comes
// from fixed data in the code, never from AI.
export async function up(db: Kysely<unknown>) {
  await db.schema.alterTable("tracks").alterColumn("level", (col) => col.dropNotNull()).execute();
  await db.schema.alterTable("tracks").addColumn("reading_plan", "text").execute();

  await db.schema.alterTable("tracks").dropConstraint("tracks_plan_source_check").execute();
  await db.schema
    .alterTable("tracks")
    .addCheckConstraint("tracks_plan_source_check", sql`plan_source in ('ai', 'demo', 'fixed')`)
    .execute();

  // Reading tracks name their plan and have no level; the other types are the opposite.
  await db.schema
    .alterTable("tracks")
    .addCheckConstraint(
      "tracks_reading_shape_check",
      sql`(type = 'reading') = (reading_plan is not null and level is null and plan_source = 'fixed')`,
    )
    .execute();

  await db.schema
    .createTable("reflections")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("user_id", "uuid", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    // One reflection per day; editing replaces it.
    .addColumn("track_day_id", "uuid", (col) =>
      col.notNull().unique().references("track_days.id").onDelete("cascade"),
    )
    .addColumn("text", "text", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();
}

export async function down(db: Kysely<unknown>) {
  await db.schema.dropTable("reflections").execute();
  await db.schema.alterTable("tracks").dropConstraint("tracks_reading_shape_check").execute();
  await db.schema.alterTable("tracks").dropConstraint("tracks_plan_source_check").execute();
  await db.schema
    .alterTable("tracks")
    .addCheckConstraint("tracks_plan_source_check", sql`plan_source in ('ai', 'demo')`)
    .execute();
  await db.schema.alterTable("tracks").dropColumn("reading_plan").execute();
  // Fails if any reading track exists: delete those before rolling back.
  await db.schema.alterTable("tracks").alterColumn("level", (col) => col.setNotNull()).execute();
}
