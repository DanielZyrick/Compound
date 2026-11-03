import { sql, type Kysely } from "kysely";

// Google Calendar (read-only): one connection per user. Tokens are stored
// encrypted (lib/calendar/crypto.ts); events are fetched live, never stored.
export async function up(db: Kysely<unknown>) {
  await db.schema
    .createTable("calendar_connections")
    .addColumn("user_id", "uuid", (col) => col.primaryKey().references("users.id").onDelete("cascade"))
    .addColumn("google_email", "text") // which Google account, shown in Settings
    .addColumn("refresh_token", "text", (col) => col.notNull()) // encrypted
    .addColumn("access_token", "text") // encrypted; refreshed when it expires
    .addColumn("access_expires_at", "timestamptz")
    .addColumn("connected_at", "timestamptz", (col) => col.notNull().defaultTo(sql`now()`))
    .execute();
}

export async function down(db: Kysely<unknown>) {
  await db.schema.dropTable("calendar_connections").execute();
}
