import { expect, test } from "@playwright/test";
import { db, open, signInFreshUser } from "./support";

// The test server runs with CALENDAR_DEMO_MODE=1: connecting makes a demo
// connection instead of going to Google.

test("connect and disconnect Google Calendar in Settings", async ({ page, context }) => {
  const user = await signInFreshUser(context);
  await open(page, "/settings");
  const section = page.getByRole("region", { name: "Google Calendar" });

  await section.getByRole("link", { name: "Connect Google Calendar" }).click();
  await expect(page).toHaveURL(/\/settings\?calendar=connected$/);
  await page.waitForLoadState("networkidle");
  await expect(section.getByText("Connected as demo@example.com")).toBeVisible();
  await expect(section.getByRole("status")).toHaveText("Google Calendar is connected.");

  // Disconnect asks first, then deletes the stored connection.
  await section.getByRole("button", { name: "Disconnect" }).click();
  await section.getByRole("button", { name: "Disconnect" }).click();
  await expect(section.getByRole("link", { name: "Connect Google Calendar" })).toBeVisible();
  const left = await db.selectFrom("calendar_connections").select("user_id").where("user_id", "=", user.id).execute();
  expect(left).toHaveLength(0);
});
