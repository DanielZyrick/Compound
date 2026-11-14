import { expect, test } from "@playwright/test";
import { sql } from "kysely";
import { alerts, db, open, signInFreshUser } from "./support";

// Learning tracks in AI demo mode (forced by playwright.config.ts), so these
// run without an API key and cost nothing.

test("create a skill track and finish its first lesson", async ({ page, context }) => {
  await signInFreshUser(context);
  await open(page, "/tracks/new");

  await page.getByText("Skill", { exact: true }).click();
  await page.getByLabel("What do you want to learn?").fill("SQL for data analysis");
  await page.getByLabel("Anything specific?").fill("Monthly sales reports, skip the basics of SELECT.");
  await page.getByText("Beginner", { exact: true }).click();
  await page.getByText("7 days", { exact: true }).click();
  await page.getByRole("button", { name: "Create track" }).click();

  // The plan: 7 days, today's open, the rest locked, and the details kept.
  await expect(page).toHaveURL(/\/tracks\/[0-9a-f-]{36}$/);
  await expect(page.getByText("Monthly sales reports, skip the basics of SELECT.")).toBeVisible();
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

  // Code is in its own block: named, coloured, with a copy button and what it gives.
  const code = page.getByRole("figure").filter({ hasText: "SELECT name, city" });
  await expect(code.locator("figcaption")).toHaveText("SQL");
  await expect(code.locator("pre.shiki span[style*='color']").first()).toBeVisible();
  await expect(code.getByRole("button", { name: "Copy SQL" })).toBeVisible();
  await expect(code.getByText("Result")).toBeVisible();
  await expect(code).toContainText("every customer in Manila");
  // A long line scrolls inside the block instead of widening the page.
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);

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

test("code in questions, choices and answers is shown as code", async ({ page, context }) => {
  test.setTimeout(60_000);
  const user = await signInFreshUser(context);
  await open(page, "/tracks/new");
  await page.getByText("Skill", { exact: true }).click();
  await page.getByLabel("What do you want to learn?").fill("Python basics");
  await page.getByText("Beginner", { exact: true }).click();
  await page.getByText("7 days", { exact: true }).click();
  await page.getByRole("button", { name: "Create track" }).click();
  await expect(page).toHaveURL(/\/tracks\/[0-9a-f-]{36}$/);
  await page.getByRole("main").getByRole("listitem").first().getByRole("link").click();
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Start lesson" }).click();

  // The demo lesson shows printed output, and code inside a sentence.
  const example = page.getByRole("figure").filter({ hasText: "steps.py" });
  await expect(example.getByText("Expected output")).toBeVisible();
  await expect(example.locator("samp")).toHaveText("1 read\n2 practise\n3 review");
  await expect(page.locator("article code").filter({ hasText: 'steps = ["read", "practise", "review"]' }).first()).toBeVisible();

  // Swap in a lesson the way the AI writes one: code on a question, backticks
  // in sentences and choices, and a fenced block as the sample answer.
  const fence = "```";
  const lesson = {
    title: "Lengths",
    minutes: 10,
    sections: [
      { heading: "Counting", paragraphs: ["Use `len(x)` to count the items in `x`."], blocks: [] },
      { heading: "Why", paragraphs: ["It works on strings and lists."], blocks: [] },
    ],
    exercises: [
      {
        type: "multiple_choice",
        question: "What does this print?",
        code: { language: "python", filename: "count.py", code: "print(len('abc'))" },
        choices: ["`3`", "`abc`", "Nothing"],
        answerIndex: 0,
        explanation: "`len` counts the three characters.",
      },
      {
        type: "multiple_choice",
        question: "Which call counts the items in `items`?",
        code: null,
        choices: ["`len(items)`", "`items.len`", "`count(items)`"],
        answerIndex: 0,
        explanation: "`len(items)` is the built-in way.",
      },
      {
        type: "open",
        question: "Write a line that prints the length of `name`.",
        code: null,
        hint: "Start with `print(`.",
        sampleAnswer: `One line is enough:\n${fence}python\nprint(len(name))\n${fence}`,
      },
    ],
  };
  await sql`
    update lessons set content = ${JSON.stringify(lesson)}::jsonb
    where track_day_id in (
      select track_days.id from track_days join tracks on tracks.id = track_days.track_id where tracks.user_id = ${user.id}
    )
  `.execute(db);
  await page.reload();
  await page.waitForLoadState("networkidle");

  // Inline code in a paragraph, with no stray backticks left on the page.
  const main = page.getByRole("main");
  await expect(main.locator("article code", { hasText: /^len\(x\)$/ })).toBeVisible();
  await expect(main).not.toContainText("`");

  // The question's code is a block with no output, and the choices are code chips.
  const first = page.locator("section").filter({ hasText: "Exercise 1" });
  const asked = first.getByRole("figure");
  await expect(asked.locator("figcaption")).toHaveText("count.py");
  await expect(asked).toContainText("print(len('abc'))");
  await expect(asked).not.toContainText("Expected output");
  await expect(first.locator("label code").first()).toHaveText("3");
  await first.locator("label").first().click();
  await first.getByRole("button", { name: "Check answer" }).click();
  await expect(first.getByText("Correct", { exact: true })).toBeVisible();
  await expect(first.locator("code", { hasText: /^len$/ })).toBeVisible(); // in the explanation

  // The open exercise: a code font to type in, and a sample answer with a code block.
  const third = page.locator("section").filter({ hasText: "Exercise 3" });
  await expect(third.getByRole("heading").locator("code")).toHaveText("name");
  await expect(third.locator("code", { hasText: "print(" }).first()).toBeVisible(); // the hint
  const box = third.getByLabel("Your answer");
  await expect(box).toHaveCSS("font-family", /mono/i);
  await box.fill("print( len(name) )");
  await third.getByRole("button", { name: "Get feedback" }).click();
  await third.getByText("Show an example answer").click();
  const sample = third.locator("details");
  await expect(sample).toContainText("One line is enough:");
  await expect(sample.getByRole("figure").locator("figcaption")).toHaveText("Python");
  await expect(sample.getByRole("figure")).toContainText("print(len(name))");
  await expect(third).not.toContainText("`");
});
