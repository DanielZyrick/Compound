import { sql, type Kysely } from "kysely";

// Contacts: people the user meets for work and wants to keep in touch with.
// A contact can have a follow-up date and be linked to one of their goals.
export async function up(db: Kysely<unknown>) {
  await db.schema
    .createTable("contacts")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("user_id", "uuid", (col) => col.notNull().references("users.id").onDelete("cascade"))
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("company", "text")
    .addColumn("role", "text")
    .addColumn("where_met", "text")
    .addColumn("email", "text")
    .addColumn("phone", "text")
    .addColumn("linkedin", "text")
    .addColumn("notes", "text")
    .addColumn("follow_up_on", "date")
    // Unlinked (not deleted) when the goal is deleted.
    .addColumn("goal_id", "uuid", (col) => col.references("goals.id").onDelete("set null"))
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addCheckConstraint("contacts_name_check", sql`char_length(name) between 1 and 80`)
    .addCheckConstraint(
      "contacts_lengths_check",
      sql`coalesce(char_length(company), 0) <= 80 and coalesce(char_length(role), 0) <= 80
        and coalesce(char_length(where_met), 0) <= 120 and coalesce(char_length(email), 0) <= 254
        and coalesce(char_length(phone), 0) <= 40 and coalesce(char_length(linkedin), 0) <= 200
        and coalesce(char_length(notes), 0) <= 2000`,
    )
    // Only https links, so a stored link can never run script.
    .addCheckConstraint("contacts_linkedin_check", sql`linkedin is null or linkedin like 'https://%'`)
    .execute();

  await db.schema.createIndex("contacts_user_id_index").on("contacts").column("user_id").execute();
}

export async function down(db: Kysely<unknown>) {
  await db.schema.dropTable("contacts").execute();
}
