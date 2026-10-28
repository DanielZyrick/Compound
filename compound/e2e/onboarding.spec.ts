import { expect, test } from "@playwright/test";
import { alerts, open, signInFreshUser } from "./support";

test("a new user completes onboarding and lands on Today", async ({ page, context }) => {
  await signInFreshUser(context, { onboarded: false });
  await open(page, "/today");
  await expect(page).toHaveURL(/\/onboarding$/);

  // Step 1: focus. Continuing without one explains what's missing.
  await page.getByRole("button", { name: "Next" }).click();
  await expect(alerts(page)).toContainText("Choose what you want to work on.");
  await page.getByText("Health", { exact: true }).click();
  await page.getByLabel("Describe what you want to achieve").fill("Run a 5K without stopping by December.");
  await page.getByRole("button", { name: "Next" }).click();

  // Step 2: habits, using a suggestion for the chosen focus.
  await expect(page.getByRole("heading", { name: "Your first habits" })).toBeVisible();
  await page.getByRole("button", { name: "Walk 20 minutes" }).click();
  await page.getByRole("button", { name: "Next" }).click();

  // Step 3: review, then start.
  await expect(page.getByRole("heading", { name: "Almost done" })).toBeVisible();
  await expect(page.getByText("Run a 5K without stopping by December.")).toBeVisible();
  await page.getByRole("button", { name: "Start" }).click();

  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole("checkbox", { name: /Walk 20 minutes/ })).toBeVisible();
});
