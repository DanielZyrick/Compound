import { sql, type Kysely } from "kysely";

// Daily lessons (generated once per track day, then reused), the learner's
// exercise attempts, and when each day was completed.
export async function up(db: Kysely<unknown>) {
  await db.schema
    .createTable("lessons")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    // One lesson per day: the unique constraint makes a double generation harmless.
    .addColumn("track_day_id", "uuid", (col) =>
      col.notNull().unique().references("track_days.id").onDelete("cascade"),
    )
    .addColumn("content", "jsonb", (col) => col.notNull()) // validated with Zod before saving
    .addColumn("source", "text", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addCheckConstraint("lessons_source_check", sql`source in ('ai', 'demo')`)
    .execute();

  await db.schema
    .createTable("attempts")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("lesson_id", "uuid", (col) =>
      col.notNull().references("lessons.id").onDelete("cascade"),
    )
    .addColumn("user_id", "uuid", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("exercise_index", "integer", (col) => col.notNull())
    .addColumn("answer", "text", (col) => col.notNull())
    // null when not graded (demo mode).
    .addColumn("is_correct", "boolean")
    .addColumn("feedback", "text")
    .addColumn("better_version", "text")
    // auto: graded by the server (multiple choice); ai or demo: open answers.
    .addColumn("source", "text", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addCheckConstraint("attempts_source_check", sql`source in ('auto', 'ai', 'demo')`)
    .addCheckConstraint("attempts_exercise_index_check", sql`exercise_index >= 0`)
    .execute();

  await db.schema
    .createIndex("attempts_lesson_id_user_id_index")
    .on("attempts")
    .columns(["lesson_id", "user_id"])
    .execute();

  await db.schema.alterTable("track_days").addColumn("completed_at", "timestamptz").execute();
}

export async function down(db: Kysely<unknown>) {
  await db.schema.alterTable("track_days").dropColumn("completed_at").execute();
  await db.schema.dropTable("attempts").execute();
  await db.schema.dropTable("lessons").execute();
}
