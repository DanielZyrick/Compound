import { Migrator, type MigrationResultSet } from "kysely/migration";
import { createDb } from "../lib/db/create-db";
import { migrations } from "./migrations";

/**
 * Applies ("up") or undoes the latest ("down") migration on the database in
 * DATABASE_URL_UNPOOLED (or DATABASE_URL), printing what it did. Returns
 * false if a migration failed. Used by db/migrate.ts and db/migrate-deploy.ts.
 */
export async function runMigrations(direction: "up" | "down"): Promise<boolean> {
  // Migrations use the direct (unpooled) connection, which is safer for schema changes.
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL_UNPOOLED is not set. See .env.example.");

  // Always show which database is about to change. The host identifies the
  // Neon branch, and never includes the password.
  console.log(`Database: ${new URL(url).hostname}`);

  const db = createDb(url);
  const migrator = new Migrator({
    db,
    provider: { getMigrations: async () => migrations },
  });

  try {
    const result =
      direction === "up" ? await migrator.migrateToLatest() : await migrator.migrateDown();
    return report(result);
  } finally {
    await db.destroy();
  }
}

function report({ error, results }: MigrationResultSet) {
  for (const r of results ?? []) {
    const action = r.direction === "Up" ? "applied" : "rolled back";
    if (r.status === "Success") console.log(`✔ ${r.migrationName} ${action}`);
    if (r.status === "Error") console.error(`✘ ${r.migrationName} failed`);
  }
  if (results?.length === 0) console.log("Nothing to do.");
  if (error) console.error(error);
  return !error;
}
