import { expect, test } from "@playwright/test";
import { sql } from "kysely";
import { addDays, todayIn } from "../lib/dates/calendar";
import { weekStart } from "../lib/habits/week";
import { reviewCardFor } from "../lib/review/week";
import { db, open, seedGoal, signInFreshUser, TEST_TIMEZONE } from "./support";

test("Today shows the week in review card on Sundays and Mondays only", async ({ page, context }) => {
  await signInFreshUser(context, { habits: [{ name: "Drink water" }] });
  await open(page, "/today");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  const card = reviewCardFor(todayIn(TEST_TIMEZONE));
  const region = page.getByRole("region", { name: "Week in review" });
  if (!card) {
    await expect(region).toHaveCount(0);
    return;
  }
  await expect(region).toContainText(card.title);
  await region.getByRole("link", { name: "Week in review" }).click();
  await expect(page).toHaveURL(new RegExp(`/review\\?week=${card.week}$`));
  await expect(page.getByRole("heading", { level: 1, name: "Week in review" })).toBeVisible();
});

// Week in review: one week across habits, goals, to-dos and money, with the
// week before one click away.

test("the week in review sums up this week and opens last week", async ({ page, context }) => {
  const user = await signInFreshUser(context, { habits: [{ name: "Drink water" }] });
  // Joined two weeks ago, so there is a last week to look back on.
  await sql`update users set created_at = now() - interval '14 days' where id = ${user.id}`.execute(db);
  await sql`update habits set created_at = now() - interval '14 days' where user_id = ${user.id}`.execute(db);

  const goal = await seedGoal(user.id, {
    title: "Launch my portfolio",
    startOffset: -14,
    deadlineOffset: 30,
    bufferDays: 3,
    milestones: [{ title: "Plan", steps: ["Pick a domain", "Write the about page"] }],
  });
  const { today } = goal;
  const monday = weekStart(today);
  await db
    .updateTable("goal_steps")
    .set({ done_on: today })
    .where("title", "=", "Pick a domain")
    .where("milestone_id", "in", db.selectFrom("goal_milestones").select("id").where("goal_id", "=", goal.id))
    .execute();

  const [habitRow] = await db.selectFrom("habits").select("id").where("user_id", "=", user.id).execute();
  await db
    .insertInto("habit_checkins")
    .values([
      { habit_id: habitRow.id, date: today },
      { habit_id: habitRow.id, date: addDays(monday, -7) },
    ])
    .execute();
  await db.insertInto("notes").values({ user_id: user.id, title: "Call the bank", done_at: new Date() }).execute();
  const category = await db
    .insertInto("money_categories")
    .values({ user_id: user.id, kind: "expense", name: "Food", icon: "food", position: 1 })
    .returning("id")
    .executeTakeFirstOrThrow();
  await db
    .insertInto("transactions")
    .values({ user_id: user.id, kind: "expense", amount_cents: 25000, category_id: category.id, occurred_on: today })
    .execute();

  // Progress links here. The link opens this week, or last week on a Monday,
  // so the test asks for this week by date.
  await open(page, "/progress");
  await page.getByRole("link", { name: "Week in review" }).click();
  await expect(page).toHaveURL(/\/review$/);
  await open(page, `/review?week=${today}`);
  await expect(page).toHaveTitle("Week in review · Compound");

  await expect(page.getByRole("region", { name: "Summary" })).toContainText(/You showed up (today|every day|1 of \d days)/);
  await expect(page.getByText("Drink water", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Pick a domain/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Call the bank/ })).toBeVisible();
  const spending = page.getByRole("region", { name: "Where the money went" });
  await expect(spending).toContainText("Food");
  await expect(spending).toContainText("₱250.00");
  await expect(page.getByRole("link", { name: "Next week" })).toHaveAttribute("aria-disabled", "true");

  // The page fits a phone: the week switcher and tiles wrap instead of widening it.
  const { width, screen } = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    screen: document.documentElement.clientWidth,
  }));
  expect(width).toBeLessThanOrEqual(screen);

  // Last week: one check-in, and none of this week's wins.
  await page.getByRole("link", { name: "Previous week" }).click();
  await expect(page).toHaveURL(new RegExp(`week=${addDays(monday, -7)}`));
  await expect(page.getByText("Last week", { exact: true })).toBeVisible();
  await expect(page.getByText("Drink water: done on 1 of 7 due days this week.")).toBeAttached();
  await expect(page.getByRole("link", { name: /Pick a domain/ })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Summary" })).toContainText("You showed up 1 of 7 days, checked in 1 time.");
});
