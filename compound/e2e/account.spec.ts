import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { alerts, db, open, signInFreshUser, TEST_EMAIL } from "./support";

// Settings → Your data: download everything as JSON, then delete the account.

test("download my data, then delete my account", async ({ page, context }) => {
  const user = await signInFreshUser(context, { habits: [{ name: "Read 10 pages" }] });
  const category = await db
    .insertInto("money_categories")
    .values({ user_id: user.id, kind: "expense", name: "Food", icon: "utensils", position: 0 })
    .returning("id")
    .executeTakeFirstOrThrow();
  await db
    .insertInto("transactions")
    .values({ user_id: user.id, kind: "expense", amount_cents: 12_550, category_id: category.id, occurred_on: "2026-11-01", note: "Lunch" })
    .execute();

  await open(page, "/settings");
  const section = page.getByRole("region", { name: "Your data" });

  // The download is one JSON file with the user's own data in it.
  const downloading = page.waitForEvent("download");
  await section.getByRole("link", { name: "Download my data" }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/^compound-export-\d{4}-\d{2}-\d{2}\.json$/);
  const data = JSON.parse(await readFile(await download.path(), "utf8"));
  expect(data.account.email).toBe(TEST_EMAIL);
  expect(data.habits.map((h: { name: string }) => h.name)).toContain("Read 10 pages");
  expect(data.money.transactions).toEqual([
    expect.objectContaining({ amount: "125.50", cents: 12_550, category: "Food", note: "Lunch" }),
  ]);

  // Delete only works after typing the word; the server checks it too.
  const confirm = section.getByLabel("Type delete to confirm");
  const deleteButton = section.getByRole("button", { name: "Delete" });
  await expect(deleteButton).toBeDisabled();
  await confirm.fill("nope");
  await expect(deleteButton).toBeDisabled();
  await confirm.fill("delete");
  await deleteButton.click();

  await expect(page).toHaveURL(/\/login\?deleted=1$/);
  await expect(page.getByRole("status")).toContainText("Your account and all its data were deleted.");
  await expect(alerts(page)).toHaveCount(0);
  expect(await db.selectFrom("users").select("id").where("id", "=", user.id).executeTakeFirst()).toBeUndefined();
  expect(await db.selectFrom("transactions").select("id").where("user_id", "=", user.id).execute()).toEqual([]);

  // Signed out: the app sends them to sign in, and the export refuses.
  await open(page, "/today");
  await expect(page).toHaveURL(/\/login/);
  expect((await page.request.get("/api/account/export")).status()).toBe(401);
});
