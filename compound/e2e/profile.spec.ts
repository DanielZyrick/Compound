import { expect, test } from "@playwright/test";
import { open, signInFreshUser } from "./support";

test("filling in About you is saved, and Today stops asking for it", async ({ page, context }) => {
  await signInFreshUser(context);

  // Today asks until the profile has an answer.
  await open(page, "/today");
  const prompt = page.getByRole("region", { name: "About you" });
  await expect(prompt).toBeVisible();
  await prompt.getByRole("link", { name: "Fill in About you" }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await page.waitForLoadState("networkidle");

  await page.getByLabel("What do you do?").fill("Junior web developer");
  await page.getByLabel("What do you want to get better at?").fill("Backend development and public speaking");
  await page.getByLabel("What do you already know?").fill("HTML, CSS, some JavaScript");
  await page.getByRole("radio", { name: "20 min" }).click();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("status")).toContainText("Saved");

  // Saved, not just shown.
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(page.getByLabel("What do you do?")).toHaveValue("Junior web developer");
  await expect(page.getByLabel("What do you want to get better at?")).toHaveValue("Backend development and public speaking");
  await expect(page.getByRole("radio", { name: "20 min" })).toHaveAttribute("aria-checked", "true");

  await open(page, "/today");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("region", { name: "About you" })).toBeHidden();
});
