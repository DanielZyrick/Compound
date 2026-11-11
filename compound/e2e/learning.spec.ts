import { expect, test } from "@playwright/test";
import { alerts, db, open, signInFreshUser } from "./support";

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
  const first = page.locator("section").filter({ hasText: "Exercise 1" });
  // Clicking the circle itself selects the choice, and switching works.
  await first.locator("label").nth(1).locator("span[aria-hidden]").click();
  await expect(first.getByRole("radio").nth(1)).toBeChecked();
  await first.locator("label").nth(0).locator("span[aria-hidden]").click();
  await expect(first.getByRole("radio").nth(0)).toBeChecked();
  await expect(first.getByRole("radio").nth(1)).not.toBeChecked();
  await first.getByRole("button", { name: "Check answer" }).click();
  await expect(first.getByText(/^(Correct|Not quite)$/)).toBeVisible();

  // The second, with nothing chosen yet: the stuck case. The browser has filled
  // a circle React doesn't know about (a click while the page was still
  // loading); clicking it again must still choose it, and that's the answer sent.
  const second = page.locator("section").filter({ hasText: "Exercise 2" });
  await second.getByRole("radio").nth(2).evaluate((el) => ((el as HTMLInputElement).checked = true));
  await second.locator("label").nth(2).locator("span[aria-hidden]").click();
  await second.getByRole("button", { name: "Check answer" }).click();
  await expect(second.getByText(/^(Correct|Not quite)$/)).toBeVisible();
  await expect(second.getByRole("radio").nth(2)).toBeChecked(); // the answer that was sent

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

test("the same track can't be created twice, and tracks can be archived and restored", async ({ page, context }) => {
  test.setTimeout(60_000); // two tracks, an archive and a restore: more steps than most tests
  const user = await signInFreshUser(context);

  async function fillNewTrack(topic: string) {
    await open(page, "/tracks/new");
    await page.getByText("Skill", { exact: true }).click();
    await page.getByLabel("What do you want to learn?").fill(topic);
    await page.getByText("Beginner", { exact: true }).click();
  }

  // A double click while the plan is being drafted makes one track, not two.
  await fillNewTrack("SQL for data analysis");
  await page.getByRole("button", { name: "Create track" }).dblclick();
  await expect(page).toHaveURL(/\/tracks\/[0-9a-f-]{36}$/);
  const trackUrl = page.url();
  const tracks = () => db.selectFrom("tracks").select("id").where("user_id", "=", user.id).execute();
  expect(await tracks()).toHaveLength(1);

  // The same topic again (any case or spacing) is refused, with a link to the one you have.
  await fillNewTrack("  sql FOR data analysis. ");
  await page.getByRole("button", { name: "Create track" }).click();
  await expect(alerts(page)).toContainText("You already have an active track");
  await alerts(page).getByRole("link", { name: "Open that track" }).click();
  await expect(page).toHaveURL(trackUrl);
  expect(await tracks()).toHaveLength(1);

  // Archive it: gone from Learn, Today and Habits, listed under Archived.
  await page.waitForLoadState("networkidle");
  const title = (await page.getByRole("heading", { level: 1 }).textContent())!;
  await page.getByRole("button", { name: "Archive track" }).click();
  await page.getByRole("button", { name: "Archive", exact: true }).click();
  await expect(page.getByText("This track is archived.")).toBeVisible();

  await open(page, "/tracks");
  const main = page.getByRole("main");
  await expect(main.getByRole("link", { name: title, exact: true })).toBeHidden();
  await main.locator("summary", { hasText: "Archived" }).click();
  await expect(main.getByRole("button", { name: `Restore ${title}` })).toBeVisible();
  await open(page, "/today");
  await expect(page.getByRole("checkbox", { name: /Learn:/ })).toBeHidden();

  // Restore it: back on Learn, with its habit.
  await open(page, "/tracks");
  await main.locator("summary", { hasText: "Archived" }).click();
  await main.getByRole("button", { name: `Restore ${title}` }).click();
  await expect(main.getByRole("button", { name: `Restore ${title}` })).toBeHidden();
  await open(page, "/tracks");
  await expect(main.getByRole("link", { name: new RegExp(title) }).first()).toBeVisible();
  await open(page, "/today");
  await expect(page.getByRole("checkbox", { name: /Learn:/ })).toBeVisible();

  // Archive straight from Learn, with the card's ⋯ menu.
  await open(page, "/tracks");
  await main.getByRole("button", { name: `More for ${title}` }).click();
  await page.getByRole("menuitem", { name: "Archive" }).click();
  await main.getByRole("button", { name: "Archive", exact: true }).click();
  await expect(main.getByRole("button", { name: `More for ${title}` })).toBeHidden(); // its card is gone
  await expect(main.locator("summary", { hasText: "Archived" })).toBeVisible();
});

test("restoring two tracks on the same topic at once keeps only one active", async ({ page, context }) => {
  const user = await signInFreshUser(context);
  // Twins that are both archived, as after the old duplicate bug.
  const twin = { user_id: user.id, topic: "Building RAG apps", type: "skill", level: "beginner", total_days: 7, start_date: "2026-01-05", status: "archived", plan_source: "demo" } as const;
  await db.insertInto("tracks").values([{ ...twin, title: "Twin one" }, { ...twin, title: "Twin two" }]).execute();

  // Two tabs, each restoring a different twin at the same moment.
  const other = await context.newPage();
  const restores = [];
  for (const [tab, title] of [[page, "Twin one"], [other, "Twin two"]] as const) {
    await open(tab, "/tracks");
    await tab.locator("summary", { hasText: "Archived" }).click();
    restores.push(tab.getByRole("button", { name: `Restore ${title}` }));
  }
  await Promise.all(restores.map((button) => button.click()));

  // One comes back; the other is told why it can't.
  const refused = async () =>
    (await alerts(page).filter({ hasText: "already have an active track" }).count()) +
    (await alerts(other).filter({ hasText: "already have an active track" }).count());
  await expect.poll(refused).toBe(1);
  const active = await db.selectFrom("tracks").select("title").where("user_id", "=", user.id).where("status", "!=", "archived").execute();
  expect(active).toHaveLength(1);
});
