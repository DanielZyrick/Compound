import { sql, type Kysely } from "kysely";

// Practice exercises for mistakes: when a learner got an exercise wrong, the
// AI writes a fresh one on the same idea. One row per practice exercise, with
// the learner's answer once given. Up to 3 per mistake (checked in code).
export async function up(db: Kysely<unknown>) {
  await db.schema
    .createTable("practice_exercises")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("user_id", "uuid", (col) => col.notNull().references("users.id").onDelete("cascade"))
    // The mistake it's for: an exercise in a lesson.
    .addColumn("lesson_id", "uuid", (col) => col.notNull().references("lessons.id").onDelete("cascade"))
    .addColumn("exercise_index", "integer", (col) => col.notNull())
    .addColumn("content", "jsonb", (col) => col.notNull()) // one exercise, validated with Zod before saving
    .addColumn("source", "text", (col) => col.notNull())
    .addColumn("answer", "text")
    // null when not graded (demo mode) or not answered yet.
    .addColumn("is_correct", "boolean")
    .addColumn("feedback", "text")
    .addColumn("better_version", "text")
    .addColumn("answered_at", "timestamptz")
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addCheckConstraint("practice_exercises_source_check", sql`source in ('ai', 'demo')`)
    .addCheckConstraint("practice_exercises_exercise_index_check", sql`exercise_index >= 0`)
    .execute();

  await db.schema
    .createIndex("practice_exercises_lesson_id_user_id_index")
    .on("practice_exercises")
    .columns(["lesson_id", "user_id", "exercise_index"])
    .execute();

  // At most one unanswered practice exercise per mistake, so a double click
  // can't write (and pay for) two.
  await db.schema
    .createIndex("practice_exercises_one_open")
    .on("practice_exercises")
    .columns(["user_id", "lesson_id", "exercise_index"])
    .unique()
    .where(sql.ref("answered_at"), "is", null)
    .execute();
}

export async function down(db: Kysely<unknown>) {
  await db.schema.dropTable("practice_exercises").execute();
}
