import { sql, type Kysely } from "kysely";

// Migrations use Kysely<unknown>: they describe the schema at the time they
// were written, so they must not depend on today's Database type.

export async function up(db: Kysely<unknown>) {
  await db.schema
    .createTable("users")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("email", "text", (col) => col.notNull().unique())
    .addColumn("name", "text")
    .addColumn("image", "text")
    .addColumn("timezone", "text", (col) => col.notNull().defaultTo("UTC"))
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createTable("user_goals")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("user_id", "uuid", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("goal", "text", (col) => col.notNull())
    .addColumn("custom_label", "text")
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addCheckConstraint(
      "user_goals_goal_check",
      sql`goal in ('career', 'business', 'faith', 'health', 'custom')`,
    )
    // A custom goal must have a label, and the fixed goals must not.
    .addCheckConstraint(
      "user_goals_custom_label_check",
      sql`(goal = 'custom') = (custom_label is not null)`,
    )
    .execute();

  await db.schema
    .createIndex("user_goals_user_id_index")
    .on("user_goals")
    .column("user_id")
    .execute();

  await db.schema
    .createTable("habits")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("user_id", "uuid", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("name", "text", (col) => col.notNull())
    // Scheduled weekdays, 0 = Sunday ... 6 = Saturday. Default: every day.
    .addColumn("schedule", sql`smallint[]`, (col) =>
      col.notNull().defaultTo(sql`'{0,1,2,3,4,5,6}'::smallint[]`),
    )
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("archived_at", "timestamptz")
    // At least one day, and only the numbers 0–6.
    .addCheckConstraint(
      "habits_schedule_check",
      sql`cardinality(schedule) > 0 and schedule <@ '{0,1,2,3,4,5,6}'::smallint[]`,
    )
    .execute();

  await db.schema.createIndex("habits_user_id_index").on("habits").column("user_id").execute();

  await db.schema
    .createTable("habit_checkins")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("habit_id", "uuid", (col) =>
      col.notNull().references("habits.id").onDelete("cascade"),
    )
    .addColumn("date", "date", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    // One check-in per habit per day. This also indexes lookups by habit_id.
    .addUniqueConstraint("habit_checkins_habit_id_date_unique", ["habit_id", "date"])
    .execute();
}

export async function down(db: Kysely<unknown>) {
  await db.schema.dropTable("habit_checkins").execute();
  await db.schema.dropTable("habits").execute();
  await db.schema.dropTable("user_goals").execute();
  await db.schema.dropTable("users").execute();
}
