import { sql, type Kysely } from "kysely";

// Touchpoints: each time the user was in touch with a contact (a coffee chat,
// a message), with a short note. "Last contacted" is worked out from these.
export async function up(db: Kysely<unknown>) {
  await db.schema
    .createTable("contact_touchpoints")
    .addColumn("id", "uuid", (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("contact_id", "uuid", (col) => col.notNull().references("contacts.id").onDelete("cascade"))
    .addColumn("happened_on", "date", (col) => col.notNull())
    .addColumn("note", "text")
    .addColumn("created_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .addCheckConstraint("contact_touchpoints_note_check", sql`note is null or char_length(note) <= 280`)
    .execute();

  await db.schema
    .createIndex("contact_touchpoints_contact_id_index")
    .on("contact_touchpoints")
    .columns(["contact_id", "happened_on"])
    .execute();
}

export async function down(db: Kysely<unknown>) {
  await db.schema.dropTable("contact_touchpoints").execute();
}
