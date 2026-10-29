import { expect, test } from "@playwright/test";
import { open, signInFreshUser } from "./support";

// Learning tracks in AI demo mode (forced by playwright.config.ts), so these
// run without an API key and cost nothing.

test("create a skill track and finish its first lesson", async ({ page, context }) => {
  await signInFreshUser(context);
  await open(page, "/tracks/new");

  await page.getByText("Skill", { exact: true }).click();
  await page.getByLabel("What do you want to learn?").fill("SQL for data analysis");
  await page.getByText("Beginner", { exact: true }).click();
  await page.getByText("7 days", { exact: true }).click();
  await page.getByRole("button", { name: "Create track" }).click();

  // The plan: 7 days, today's open, the rest locked.
  await expect(page).toHaveURL(/\/tracks\/[0-9a-f-]{36}$/);
  await expect(page.getByText("Example plan", { exact: true })).toBeVisible();
  const days = page.getByRole("main").getByRole("listitem");
  await expect(days).toHaveCount(7);
  await days.first().getByRole("link").click();
  await page.waitForLoadState("networkidle");

  // Start the lesson. Answers must not be in the page before they're given.
  await page.getByRole("button", { name: "Start lesson" }).click();
  await expect(page.getByRole("heading", { name: "Practice" })).toBeVisible();
  const html = await page.content();
  expect(html).not.toContain("answerIndex");
  expect(html).not.toContain("sampleAnswer");

  // Two multiple-choice questions, graded on the server.
  for (const index of [0, 1]) {
    const exercise = page.locator("section").filter({ hasText: `Exercise ${index + 1}` });
    // Tap the first choice the way a person would: the whole card is its label.
    await exercise.locator("label").first().click();
    await expect(exercise.getByRole("radio").first()).toBeChecked();
    await exercise.getByRole("button", { name: "Check answer" }).click();
    await expect(exercise.getByText(/^(Correct|Not quite)$/)).toBeVisible();
  }

  // One written answer: in demo mode it's shown with an example, not graded.
  const written = page.locator("section").filter({ hasText: "Exercise 3" });
  await written.getByRole("textbox").fill("I would practise ten minutes a day on a real query.");
  await written.getByRole("button", { name: "Get feedback" }).click();
  await expect(written.getByText("Not graded")).toBeVisible();

  await page.getByRole("button", { name: "Complete lesson" }).click();
  await expect(page.getByText("Lesson complete. Nice work!")).toBeVisible();

  // Today lists the lesson as done, and the track's habit is checked.
  await open(page, "/today");
  await expect(page.locator("section").filter({ hasText: "Today's learning" })).toContainText("1 of 1 done");
  await expect(page.getByRole("checkbox", { name: /Learn:/ })).toHaveAttribute("aria-checked", "true");
});

test("a reading track links to a real translation and saves a reflection", async ({ page, context }) => {
  await signInFreshUser(context);
  await open(page, "/tracks/new");

  await page.getByText("Reading", { exact: true }).click();
  await page.getByText("The Gospel of John in 21 days").click();
  await page.getByRole("button", { name: "Create track" }).click();

  await expect(page).toHaveURL(/\/tracks\/[0-9a-f-]{36}$/);
  const days = page.getByRole("main").getByRole("listitem");
  await expect(days).toHaveCount(21);
  await days.first().getByRole("link").click();
  await page.waitForLoadState("networkidle");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("John 1");
  await expect(page.getByRole("link", { name: /Read John 1/ })).toHaveAttribute(
    "href",
    "https://www.biblegateway.com/passage/?search=John+1&version=NIV",
  );

  await page.getByRole("textbox").fill("The Word was there from the beginning, so I can start each day listening.");
  await page.getByRole("button", { name: "Save and complete" }).click();
  await expect(page.getByText("Reading complete. Well done!")).toBeVisible();
});

test("finishing a day opens the next one early, in order", async ({ page, context }) => {
  await signInFreshUser(context);
  await open(page, "/tracks/new");
  await page.getByText("Reading", { exact: true }).click();
  await page.getByText("The Gospel of John in 21 days").click();
  await page.getByRole("button", { name: "Create track" }).click();
  await expect(page).toHaveURL(/\/tracks\/[0-9a-f-]{36}$/);
  const trackUrl = page.url();

  // Day 3 is locked until day 2 is done.
  await open(page, `${trackUrl}/day/3`);
  await expect(page.getByText("Finish day 2 to open this reading.")).toBeVisible();

  // Finish day 1, then continue straight to day 2 on the same day.
  await open(page, `${trackUrl}/day/1`);
  await page.getByRole("textbox").fill("A first reflection, long enough to save.");
  await page.getByRole("button", { name: "Save and complete" }).click();
  await page.getByRole("link", { name: "Continue to day 2" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("John 2");
  await expect(page.getByRole("button", { name: "Save and complete" })).toBeVisible();

  // Today shows the day finished today, with a way to keep going.
  await open(page, "/today");
  await expect(page.getByRole("link", { name: "Keep going: day 2" })).toBeVisible();

  // The plan counts what's done and points at what's next.
  await open(page, trackUrl);
  await expect(page.getByText("1 of 21 done")).toBeVisible();
  await expect(page.getByRole("link", { name: "Continue with day 2" })).toBeVisible();
});
