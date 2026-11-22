import { db, deleteAllTestUsers } from "./support";

// After the whole run: remove every worker's test user, and any demo accounts
// a failed demo test left behind, from the dev database.
export default async function globalTeardown() {
  await deleteAllTestUsers();
  await db.deleteFrom("users").where("is_demo", "=", true).execute();
  await db.destroy();
}
