import { expect, test } from "@playwright/test";
import { alerts, open, signInFreshUser } from "./support";

test("checking a habit on Today is saved", async ({ page, context }) => {
  await signInFreshUser(context, { habits: [{ name: "Read 10 pages" }] });
  await open(page, "/today");

  const habit = page.getByRole("checkbox", { name: /Read 10 pages/ });
  await expect(habit).toHaveAttribute("aria-checked", "false");
  // The tick shows at once (optimistic); wait for the save request itself to
  // finish too, or the reload below would cancel it.
  const saved = page.waitForResponse((r) => r.request().method() === "POST" && r.url().endsWith("/today"));
  await habit.click();
  await expect(habit).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText("1 of 1 done")).toBeVisible();
  await saved;

  // Still checked after a reload: it was saved, not just shown.
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("checkbox", { name: /Read 10 pages/ })).toHaveAttribute("aria-checked", "true");
});

test("habits can be added, and duplicate names are rejected", async ({ page, context }) => {
  await signInFreshUser(context, { habits: [{ name: "Read 10 pages" }] });
  await open(page, "/habits");

  await page.getByRole("button", { name: "New habit" }).click();
  await page.getByLabel("New habit").fill("read 10 PAGES");
  await page.getByRole("button", { name: "Add habit" }).click();
  await expect(alerts(page)).toContainText("already have an active habit with that name");

  await page.getByLabel("New habit").fill("Stretch for 5 minutes");
  await page.getByRole("button", { name: "Add habit" }).click();
  await expect(page.getByText("Stretch for 5 minutes")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Active/ })).toContainText("2");
});
