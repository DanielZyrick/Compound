// Run with: npm run db:migrate   (apply all new migrations)
//           npm run db:rollback  (undo the most recent migration)
import { Migrator, type MigrationResultSet } from "kysely/migration";
import { createDb } from "../lib/db/create-db";
import { migrations } from "./migrations";

// Locally the URL comes from .env.local; elsewhere it may already be in the environment.
try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local file: rely on the existing environment.
}

async function main() {
  const direction = process.argv[2];
  if (direction !== "up" && direction !== "down") {
    throw new Error('Usage: tsx db/migrate.ts <up|down>');
  }

  // Migrations use the direct (unpooled) connection, which is safer for schema changes.
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL_UNPOOLED is not set. See .env.example.");

  const db = createDb(url);
  const migrator = new Migrator({
    db,
    provider: { getMigrations: async () => migrations },
  });

  try {
    const result =
      direction === "up" ? await migrator.migrateToLatest() : await migrator.migrateDown();
    report(result);
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
  if (error) {
    console.error(error);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
