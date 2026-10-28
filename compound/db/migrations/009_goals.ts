import { sql, type Kysely } from "kysely";

// Goals: a deadline with built-in buffer time, broken into milestones and
// small steps. Progress, status and adjusted dates are calculated from
// these rows (lib/goals/schedule.ts), never stored.
export async function up(db: Kysely<unknown>) {
  await db.schema
    .createTable("goals")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("user_id", "uuid", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("why", "text", (col) => col.notNull()) // the user's reason, in their words
    .addColumn("start_date", "date", (col) => col.notNull())
    .addColumn("deadline", "date", (col) => col.notNull())
    // Days before the deadline kept free for things that go wrong.
    .addColumn("buffer_days", "integer", (col) => col.notNull())
    .addColumn("status", "text", (col) => col.notNull().defaultTo("active"))
    .addColumn("plan_source", "text", (col) => col.notNull())
    // The execution guide: JSON validated with Zod before saving and after reading.
    .addColumn("guide", "jsonb")
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("completed_at", "timestamptz")
    .addCheckConstraint("goals_dates_check", sql`deadline > start_date`)
    .addCheckConstraint("goals_buffer_days_check", sql`buffer_days >= 0 and start_date + buffer_days < deadline`)
    .addCheckConstraint("goals_status_check", sql`status in ('active', 'completed', 'archived')`)
    .addCheckConstraint("goals_plan_source_check", sql`plan_source in ('ai', 'demo')`)
    .execute();

  await db.schema.createIndex("goals_user_id_index").on("goals").column("user_id").execute();

  await db.schema
    .createTable("goal_milestones")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("goal_id", "uuid", (col) =>
      col.notNull().references("goals.id").onDelete("cascade"),
    )
    .addColumn("position", "integer", (col) => col.notNull())
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("description", "text")
    // Relative effort (1 = small, 5 = large); planned dates are spread by weight.
    .addColumn("weight", "integer", (col) => col.notNull().defaultTo(1))
    // The date from the original plan. Adjusted dates are calculated, not stored.
    .addColumn("planned_due", "date", (col) => col.notNull())
    .addUniqueConstraint("goal_milestones_goal_id_position_unique", ["goal_id", "position"])
    .addCheckConstraint("goal_milestones_weight_check", sql`weight between 1 and 5`)
    .execute();

  await db.schema
    .createTable("goal_steps")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("milestone_id", "uuid", (col) =>
      col.notNull().references("goal_milestones.id").onDelete("cascade"),
    )
    .addColumn("position", "integer", (col) => col.notNull())
    .addColumn("title", "text", (col) => col.notNull())
    .addColumn("done_on", "date") // the user's local date when ticked off; null = not done
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex("goal_steps_milestone_id_index")
    .on("goal_steps")
    .column("milestone_id")
    .execute();
}

export async function down(db: Kysely<unknown>) {
  await db.schema.dropTable("goal_steps").execute();
  await db.schema.dropTable("goal_milestones").execute();
  await db.schema.dropTable("goals").execute();
}
