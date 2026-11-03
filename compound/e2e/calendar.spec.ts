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

test("today's events on Today, and the week on Schedule", async ({ page, context }) => {
  await signInFreshUser(context);

  // Not connected: no card on Today, and Schedule offers to connect.
  await open(page, "/today");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("region", { name: "Schedule" })).toBeHidden();
  await open(page, "/schedule");
  await page.getByRole("main").getByRole("link", { name: "Connect Google Calendar" }).click();
  await expect(page).toHaveURL(/\/settings\?calendar=connected$/);

  // Connected (demo calendar): today's events on Today.
  await open(page, "/today");
  const card = page.getByRole("region", { name: "Schedule" });
  await expect(card.getByText("Team standup")).toBeVisible();
  await expect(card.getByText("Lunch with Ana")).toBeVisible();
  await expect(card.getByText("Salcedo Market")).toBeVisible();
  await expect(card.getByText("Mom's birthday")).toBeHidden(); // tomorrow

  // The week: tomorrow's all-day event and later days.
  await card.getByRole("link", { name: "This week" }).click();
  await expect(page).toHaveURL(/\/schedule$/);
  const main = page.getByRole("main");
  await expect(main.getByRole("listitem").filter({ has: page.getByRole("heading", { name: /^Tomorrow/ }) })).toContainText(
    "Mom's birthday",
  );
  await expect(main.getByText("Dentist")).toBeVisible();
  await expect(main.getByText("Run club")).toBeVisible();
});
