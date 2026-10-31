import { sql, type Kysely } from "kysely";

// "About you": a short profile the AI uses to make principles, tracks and goal
// plans fit the person. One row per user, every field optional.
// The recommendation columns hold the saved "Recommended for you" tracks.
export async function up(db: Kysely<unknown>) {
  await db.schema
    .createTable("profiles")
    .addColumn("user_id", "uuid", (col) => col.primaryKey().references("users.id").onDelete("cascade"))
    .addColumn("role", "text", (col) => col.check(sql`char_length(role) <= 120`))
    .addColumn("improve", "text", (col) => col.check(sql`char_length(improve) <= 300`))
    .addColumn("skills", "text", (col) => col.check(sql`char_length(skills) <= 300`))
    .addColumn("interests", "text", (col) => col.check(sql`char_length(interests) <= 300`))
    .addColumn("daily_minutes", "integer", (col) => col.check(sql`daily_minutes in (10, 20, 30, 60)`))
    .addColumn("recommendations", "jsonb") // validated with Zod before saving
    .addColumn("recommended_at", "timestamptz")
    .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();
}

export async function down(db: Kysely<unknown>) {
  await db.schema.dropTable("profiles").execute();
}
