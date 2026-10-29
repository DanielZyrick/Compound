import { expect, test } from "@playwright/test";
import { alerts, open } from "./support";

// Pages anyone can see, and what happens to signed-out visitors.

test("the landing page introduces Compound", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Compound/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Small daily steps");
  await expect(page.getByRole("link", { name: /Get started/ }).first()).toBeVisible();
});

test("signed-out visitors are sent to the login page", async ({ page }) => {
  await page.goto("/today");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with GitHub" })).toBeVisible();
});

test("the privacy policy is public and linked from the login page", async ({ page }) => {
  await open(page, "/login");
  await page.getByRole("link", { name: "privacy policy" }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole("heading", { level: 1, name: "Privacy" })).toBeVisible();
  await expect(page.getByText("Anthropic")).toBeVisible();
});

test("the login page explains sign-in errors", async ({ page }) => {
  await open(page, "/login?error=AccessDenied");
  await expect(alerts(page)).toContainText("couldn't confirm your email address");
});
