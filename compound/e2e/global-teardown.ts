import { db, deleteTestUser } from "./support";

// After the whole run: remove the test user, and any demo accounts a failed
// demo test left behind, from the dev database.
export default async function globalTeardown() {
  await deleteTestUser();
  await db.deleteFrom("users").where("is_demo", "=", true).execute();
  await db.destroy();
}
