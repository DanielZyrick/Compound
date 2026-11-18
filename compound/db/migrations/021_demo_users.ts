import { sql, type Kysely } from "kysely";

// Demo users: throwaway accounts made by "Try the demo". They never call the
// AI or Google, and they're deleted 24 hours after they're created.
export async function up(db: Kysely<unknown>) {
  await db.schema
    .alterTable("users")
    .addColumn("is_demo", "boolean", (col) => col.notNull().defaultTo(false))
    .execute();
  // Finding old demo users to delete, and counting recent ones for the cap.
  await db.schema
    .createIndex("users_demo_created_at")
    .on("users")
    .column("created_at")
    .where(sql.ref("is_demo"), "=", true)
    .execute();
}

export async function down(db: Kysely<unknown>) {
  await db.schema.dropIndex("users_demo_created_at").execute();
  await db.schema.alterTable("users").dropColumn("is_demo").execute();
}
