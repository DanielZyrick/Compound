import { expect, test } from "@playwright/test";
import { db, open, signInFreshUser } from "./support";

test("Learn asks for About you before it can recommend tracks", async ({ page, context }) => {
  await signInFreshUser(context);
  await open(page, "/tracks");
  const card = page.getByRole("region", { name: "Recommended for you" });
  await expect(card.getByRole("link", { name: "Fill in About you" })).toBeVisible();
});

test("a recommended track opens the form filled in, and can be created", async ({ page, context }) => {
  const user = await signInFreshUser(context);
  await db
    .insertInto("profiles")
    .values({ user_id: user.id, role: "Junior web developer", improve: "Backend development", daily_minutes: 20 })
    .execute();

  // Three ideas appear (demo mode), and "Suggest others" swaps them.
  await open(page, "/tracks");
  const card = page.getByRole("region", { name: "Recommended for you" });
  const starts = card.getByRole("link", { name: /^Start / });
  await expect(starts).toHaveCount(3);
  const first = await starts.first().getAttribute("aria-label");
  await card.getByRole("button", { name: "Suggest others" }).click();
  await expect(starts.first()).not.toHaveAttribute("aria-label", first!);
  await expect(starts).toHaveCount(3);

  // Saved: a reload shows the same ideas without asking again.
  const shown = await starts.first().getAttribute("aria-label");
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(starts.first()).toHaveAttribute("aria-label", shown!);

  // "Start this" fills in the form.
  const topic = shown!.replace(/^Start /, "");
  await starts.first().click();
  await expect(page).toHaveURL(/\/tracks\/new\?/);
  await page.waitForLoadState("networkidle");
  await expect(page.getByLabel("What do you want to learn?")).toHaveValue(topic);
  await page.getByRole("button", { name: "Create track" }).click();
  await expect(page).toHaveURL(/\/tracks\/[0-9a-f-]{36}$/);
});
