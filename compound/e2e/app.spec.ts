import { expect, test } from "@playwright/test";
import { open, signInFreshUser } from "./support";

test("a missing track shows the in-app 404", async ({ page, context }) => {
  await signInFreshUser(context);
  await open(page, "/tracks/00000000-0000-4000-8000-000000000000");
  await expect(page.getByRole("heading", { name: "We couldn't find that" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Go to Today", exact: true })).toBeVisible();
});

test("settings change the display name", async ({ page, context }) => {
  await signInFreshUser(context);
  await open(page, "/settings");
  await expect(page).toHaveTitle("Settings · Compound");

  await page.getByLabel("Display name").fill("Renamed Tester");
  await page.getByRole("button", { name: "Save" }).first().click();
  await expect(page.getByRole("status")).toContainText("Saved");

  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(page.getByLabel("Display name")).toHaveValue("Renamed Tester");
});

test("the progress page shows stats and habit grids", async ({ page, context }) => {
  await signInFreshUser(context, { habits: [{ name: "Drink water" }] });
  await open(page, "/progress");
  await expect(page.getByText("Check-ins")).toBeVisible();
  await expect(page.getByText("Drink water", { exact: true })).toBeVisible();
  await expect(page.getByText(/done on 0 of \d+ scheduled days/)).toBeAttached();
});
