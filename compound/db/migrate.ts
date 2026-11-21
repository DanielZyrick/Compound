// Run with: npm run db:migrate   (apply all new migrations)
//           npm run db:rollback  (undo the most recent migration)
import { runMigrations } from "./run-migrations";

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
  if (!(await runMigrations(direction))) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
