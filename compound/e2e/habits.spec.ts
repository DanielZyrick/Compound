import { expect, test } from "@playwright/test";
import { sql } from "kysely";
import { todayIn } from "../lib/dates/calendar";
import { alerts, db, open, signInFreshUser } from "./support";

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

test("a missed day can be filled in on the Habits page, but not a lesson's habit", async ({ page, context }) => {
  const user = await signInFreshUser(context, {
    habits: [{ name: "Gym" }, { name: "Learn: Python Foundations" }],
  });
  // Both habits started two weeks ago, so the whole last week can be filled in.
  await db
    .updateTable("habits")
    .set({ created_at: sql`now() - interval '14 days'` })
    .where("user_id", "=", user.id)
    .execute();
  const learn = await db
    .selectFrom("habits")
    .select("id")
    .where("user_id", "=", user.id)
    .where("name", "=", "Learn: Python Foundations")
    .executeTakeFirstOrThrow();
  await db
    .insertInto("tracks")
    .values({
      user_id: user.id,
      title: "Python Foundations",
      topic: "Python",
      type: "skill",
      level: "beginner",
      reading_plan: null,
      total_days: 7,
      start_date: todayIn("Asia/Manila"),
      habit_id: learn.id,
      plan_source: "demo",
    })
    .execute();

  await open(page, "/habits");
  await expect(page.getByText(/Missed a day\? Tap it to fill it in, but be honest/)).toBeVisible();
  await expect(page.getByText("Ticked off by finishing a lesson.")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Learn: Python Foundations on / })).toHaveCount(0);

  // Yesterday is the last day in Gym's row.
  const days = page.getByRole("list", { name: "Gym, last 7 days" }).getByRole("button");
  await expect(days).toHaveCount(7);
  const yesterday = days.last();
  await expect(yesterday).toHaveAttribute("aria-pressed", "false");
  const saved = page.waitForResponse((r) => r.request().method() === "POST" && r.url().endsWith("/habits"));
  await yesterday.click();
  await expect(yesterday).toHaveAttribute("aria-pressed", "true");
  await saved;

  // Saved, and it counts: a 1-day streak and one check-in.
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("list", { name: "Gym, last 7 days" }).getByRole("button").last()).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByText("Every day · 1 check-in")).toBeVisible();
});
