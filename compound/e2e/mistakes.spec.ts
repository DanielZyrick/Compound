import { expect, test } from "@playwright/test";
import { open, signInFreshUser } from "./support";

// Mistakes to review, in AI demo mode: multiple choice is graded on the
// server without AI, so a wrong pick is a real mistake here.

test("a wrong answer shows up in Mistakes to review, with the right answer", async ({ page, context }) => {
  await signInFreshUser(context);
  await open(page, "/tracks/new");
  await page.getByText("Skill", { exact: true }).click();
  await page.getByLabel("What do you want to learn?").fill("Spanish for travel");
  await page.getByText("Beginner", { exact: true }).click();
  await page.getByText("7 days", { exact: true }).click();
  await page.getByRole("button", { name: "Create track" }).click();
  await expect(page).toHaveURL(/\/tracks\/[0-9a-f-]{36}$/);
  const trackUrl = page.url();

  // No mistakes yet, so no card.
  await expect(page.getByRole("link", { name: /Mistakes/ })).toBeHidden();

  await page.getByRole("main").getByRole("listitem").first().getByRole("link").click();
  await page.getByRole("button", { name: "Start lesson" }).click();
  await expect(page.getByRole("heading", { name: "Practice" })).toBeVisible();

  // Exercise 1 wrong (the demo's right answer is always the first choice), exercise 2 right.
  const first = page.locator("section").filter({ hasText: "Exercise 1" });
  await first.locator("label").nth(2).click();
  await first.getByRole("button", { name: "Check answer" }).click();
  await expect(first.getByText(/^Not quite$/)).toBeVisible();
  const second = page.locator("section").filter({ hasText: "Exercise 2" });
  await second.locator("label").nth(0).click();
  await second.getByRole("button", { name: "Check answer" }).click();
  await expect(second.getByText(/^Correct$/)).toBeVisible();

  // Today counts it under Today's learning, and so does Week in review.
  await open(page, "/today");
  const todayLine = page.getByRole("list", { name: "Mistakes to review" }).getByRole("link");
  await expect(todayLine).toHaveCount(1);
  await expect(todayLine).toContainText("1 mistake to review");
  await expect(todayLine).toContainText("Spanish for travel");
  await open(page, "/review");
  await expect(page.getByRole("region", { name: "Mistakes to review" })).toContainText("1 mistake");

  // The track page counts it and links to the list.
  await open(page, trackUrl.replace(/^https?:\/\/[^/]+/, ""));
  await page.getByRole("link", { name: /Mistakes to review · 1/ }).click();
  await expect(page).toHaveURL(/\/mistakes$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mistakes to review");

  const mistakes = page.getByRole("main").getByRole("article");
  await expect(mistakes).toHaveCount(1);
  const mistake = mistakes.first();
  await expect(mistake).toContainText("Day 1 · Exercise 1");
  await expect(mistake).toContainText("Your answer");
  await expect(mistake).toContainText("Skip practice and only read");
  await expect(mistake).toContainText("The right answer");
  await expect(mistake).toContainText("Small daily lessons focus on one clear step");
  await expect(page.getByRole("link", { name: "All (1)" })).toBeVisible();

  // Practice: a fresh exercise on the same idea (a labelled example in demo
  // mode). The demo's wrong choices are known; the right one is the other one.
  const wrongChoices = /Memorise every detail|Skip practice and only read|Wait until you feel ready/;
  await mistake.getByRole("button", { name: "Practice this" }).click();
  const practice1 = mistake.locator("section").filter({ hasText: "Practice 1 · example" });
  await expect(practice1).toContainText("Example practice 1 (AI isn't connected)");
  await expect(mistake.getByRole("button", { name: /Practice (this|again)/ })).toBeHidden(); // one at a time
  await practice1.locator("label").filter({ hasText: wrongChoices }).first().click();
  await practice1.getByRole("button", { name: "Check answer" }).click();
  await expect(practice1.getByText(/^Not quite$/)).toBeVisible();

  // Wrong again: another try, then the right answer fixes it.
  await mistake.getByRole("button", { name: "Practice again" }).click();
  const practice2 = mistake.locator("section").filter({ hasText: "Practice 2 · example" });
  await practice2.locator("label").filter({ hasNotText: wrongChoices }).click();
  await practice2.getByRole("button", { name: "Check answer" }).click();
  await expect(practice2.getByText(/^Correct$/)).toBeVisible();
  await expect(mistake.getByText("Fixed in practice")).toBeVisible();
  await expect(mistake.getByRole("button", { name: /Practice/ })).toBeHidden();
  // It stays in view today, but no longer counts.
  await expect(page.getByRole("link", { name: "To review (0)" })).toBeVisible();

  // It links back to its lesson.
  await mistake.getByRole("link", { name: /Open the lesson/ }).click();
  await expect(page).toHaveURL(/\/day\/1$/);

  // The track page says they're all fixed.
  await open(page, trackUrl.replace(/^https?:\/\/[^/]+/, ""));
  await expect(page.getByRole("link", { name: /Mistakes: all fixed/ })).toBeVisible();

  // Today has nothing left to review; Week in review lists the fix.
  await open(page, "/today");
  await expect(page.getByRole("heading", { name: "Today's learning" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Mistakes to review" })).toBeHidden();
  await open(page, "/review");
  await expect(page.getByRole("region", { name: "Mistakes fixed in practice" })).toContainText("Day 1 · ");
  await expect(page.getByRole("region", { name: "Mistakes to review" })).toBeHidden();
});
