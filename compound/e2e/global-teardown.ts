import { db, deleteTestUser } from "./support";

// After the whole run: remove the test user and their data from the dev database.
export default async function globalTeardown() {
  await deleteTestUser();
  await db.destroy();
}
