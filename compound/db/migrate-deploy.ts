// Runs on Vercel before `next build` (vercel.json → npm run build:vercel).
// Production deploys apply new migrations first; if one fails, the build
// fails and the current deployment stays live. Preview builds never migrate.
// It never reads .env.local: on Vercel the environment is set directly.
import { runMigrations } from "./run-migrations";

async function main() {
  const env = process.env.VERCEL_ENV;
  if (env !== "production") {
    console.log(`Skipping migrations: not a production deploy (VERCEL_ENV=${env ?? "not set"}).`);
    return;
  }
  if (!(await runMigrations("up"))) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
