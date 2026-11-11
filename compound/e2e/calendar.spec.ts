import { expect, test } from "@playwright/test";
import { demoEvents } from "../lib/calendar/events";
import { biggestFreeGap, clockLabel, minutesNowIn } from "../lib/calendar/free";
import { blocksForDay } from "../lib/calendar/week";
import { todayIn } from "../lib/dates/calendar";
import { db, open, signInFreshUser, TEST_TIMEZONE } from "./support";

/**
 * The free block Today should point out right now ("5:00 PM – 9:00 PM"), or
 * null for none. Undefined when the clock is about to change the answer, so
 * the test can't be sure which one the server saw.
 */
function freeBlockNow(): string | null | undefined {
  const today = todayIn(TEST_TIMEZONE);
  const blocks = blocksForDay(demoEvents(today, TEST_TIMEZONE), today, TEST_TIMEZONE);
  const at = (ms: number) => {
    const gap = biggestFreeGap(blocks, minutesNowIn(TEST_TIMEZONE, new Date(Date.now() + ms)));
    return gap && `${clockLabel(gap.startMin)} – ${clockLabel(gap.endMin)}`;
  };
  return at(-60_000) === at(60_000) ? at(0) : undefined;
}

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

  // The longest free block still ahead today, if there is one at this hour.
  const free = freeBlockNow();
  if (free) await expect(card).toContainText(`Free ${free}`);
  if (free === null) await expect(card).not.toContainText("Free ");

  // The week grid. The demo calendar starts on the week's Monday: four events
  // that day (lunch and the design sync overlap), an all-day birthday on
  // Tuesday, the dentist on Wednesday.
  await card.getByRole("link", { name: "This week" }).click();
  await expect(page).toHaveURL(/\/schedule$/);
  await page.waitForLoadState("networkidle");
  const main = page.getByRole("main");
  const event = (name: RegExp) => main.getByRole("group", { name });

  if (test.info().project.name === "mobile") {
    // Phones: one day at a time, picked from the strip.
    await main.getByRole("tab", { name: /^Monday/ }).click();
    await expect(event(/^Team standup, 9:30 AM/)).toBeVisible();
    await expect(event(/^Design sync/)).toBeVisible();
    await main.getByRole("tab", { name: /^Tuesday/ }).click();
    await expect(main.getByRole("list", { name: "All day" })).toContainText("Mom's birthday");
    await main.getByRole("tab", { name: /^Wednesday/ }).click();
    await expect(event(/^Dentist, 10:00 AM – 11:00 AM, Makati Medical Center$/)).toBeVisible();
  } else {
    await expect(event(/^Team standup, 9:30 AM – 9:45 AM/)).toBeVisible();
    await expect(event(/^Dentist, 10:00 AM – 11:00 AM/)).toBeVisible();
    await expect(main.getByRole("list", { name: "All day" }).filter({ hasText: "Mom's birthday" })).toBeVisible();

    // Overlapping events share the width, side by side.
    const lunch = await event(/^Lunch with Ana/).boundingBox();
    const sync = await event(/^Design sync/).boundingBox();
    expect(lunch && sync && sync.x > lunch.x && lunch.width < 120).toBeTruthy();
  }

  // Next week, and back with Today.
  const range = main.getByRole("navigation", { name: "Week" });
  const thisWeek = await range.textContent();
  await range.getByRole("link", { name: "Next week" }).click();
  await expect(page).toHaveURL(/\/schedule\?week=\d{4}-\d{2}-\d{2}$/);
  await expect(range).not.toHaveText(thisWeek!);
  await range.getByRole("link", { name: "Today" }).click();
  await expect(page).toHaveURL(/\/schedule$/);
  await expect(range).toHaveText(thisWeek!);
});
