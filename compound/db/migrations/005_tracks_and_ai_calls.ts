import { sql, type Kysely } from "kysely";

// Learning tracks, their day-by-day plans, and a log of every AI call (used
// for the per-user daily limit and to see what the AI costs).
export async function up(db: Kysely<unknown>) {
  await db.schema
    .createTable("tracks")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("user_id", "uuid", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("topic", "text", (col) => col.notNull()) // what the user asked to learn
    .addColumn("type", "text", (col) => col.notNull())
    .addColumn("level", "text", (col) => col.notNull())
    .addColumn("total_days", "integer", (col) => col.notNull())
    .addColumn("start_date", "date", (col) => col.notNull())
    // The habit that a finished lesson checks off. Kept if the habit is deleted.
    .addColumn("habit_id", "uuid", (col) => col.references("habits.id").onDelete("set null"))
    .addColumn("status", "text", (col) => col.notNull().defaultTo("active"))
    // "ai" when Claude wrote the plan, "demo" for the built-in example plan
    // used when no API key is configured.
    .addColumn("plan_source", "text", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addCheckConstraint("tracks_type_check", sql`type in ('skill', 'reading', 'thinking')`)
    .addCheckConstraint(
      "tracks_level_check",
      sql`level in ('beginner', 'intermediate', 'advanced')`,
    )
    .addCheckConstraint("tracks_status_check", sql`status in ('active', 'completed', 'archived')`)
    .addCheckConstraint("tracks_plan_source_check", sql`plan_source in ('ai', 'demo')`)
    .addCheckConstraint("tracks_total_days_check", sql`total_days between 1 and 365`)
    .execute();

  await db.schema.createIndex("tracks_user_id_index").on("tracks").column("user_id").execute();

  await db.schema
    .createTable("track_days")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("track_id", "uuid", (col) =>
      col.notNull().references("tracks.id").onDelete("cascade"),
    )
    .addColumn("day_number", "integer", (col) => col.notNull())
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("summary", "text", (col) => col.notNull())
    .addUniqueConstraint("track_days_track_id_day_number_unique", ["track_id", "day_number"])
    .addCheckConstraint("track_days_day_number_check", sql`day_number >= 1`)
    .execute();

  await db.schema
    .createTable("ai_calls")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("user_id", "uuid", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    // The user's local date at the time of the call: the daily limit counts these.
    .addColumn("day", "date", (col) => col.notNull())
    .addColumn("purpose", "text", (col) => col.notNull()) // e.g. "track_plan"
    .addColumn("model", "text", (col) => col.notNull())
    .addColumn("ok", "boolean", (col) => col.notNull())
    .addColumn("input_tokens", "integer")
    .addColumn("output_tokens", "integer")
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex("ai_calls_user_id_day_index")
    .on("ai_calls")
    .columns(["user_id", "day"])
    .execute();
}

export async function down(db: Kysely<unknown>) {
  await db.schema.dropTable("ai_calls").execute();
  await db.schema.dropTable("track_days").execute();
  await db.schema.dropTable("tracks").execute();
}
