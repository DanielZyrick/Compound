import { expect, test } from "@playwright/test";
import { db, open } from "./support";

// "Try the demo": a visitor with no account opens a sample account from the
// landing page, looks around, then leaves it, which deletes the account.

const demoUsers = () =>
  db.selectFrom("users").select("id").where("is_demo", "=", true).execute().then((rows) => rows.map((r) => r.id));

test("try the demo from the landing page, then leave it", async ({ page }) => {
  const before = await demoUsers();
  await open(page, "/");
  await page.getByRole("button", { name: "Try the demo" }).first().click();

  // A new demo account, signed in and already full of sample data.
  await expect(page).toHaveURL(/\/today$/, { timeout: 30_000 });
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("status").filter({ hasText: "You're exploring a demo" })).toBeVisible();
  // "Read 10 pages" is due every day (the gym habit isn't, so it may not be on Today).
  await expect(page.getByRole("checkbox", { name: /Read 10 pages .* 8-day streak/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Launch my portfolio website/ }).first()).toBeVisible();
  await expect(page.getByRole("region", { name: "Follow up" }).getByRole("link", { name: /Ana Reyes/ })).toBeVisible();

  const created = (await demoUsers()).filter((id) => !before.includes(id));
  expect(created).toHaveLength(1);

  // The sample track: four days done, day 5 up next.
  await open(page, "/tracks");
  await page.getByText(/Python for automating everyday tasks/).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Python for automating everyday tasks/);
  await expect(page.getByRole("link", { name: "Continue with day 5" })).toBeVisible();

  // Leaving signs out and deletes the account straight away.
  await page.getByRole("button", { name: "Sign in to start your own" }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(await demoUsers()).not.toContain(created[0]);
});
