import { expect, test } from "@playwright/test";
import { describeFollowUp } from "../lib/contacts/follow-up";
import { addDays } from "../lib/dates/calendar";
import { alerts, db, open, seedGoal, signInFreshUser } from "./support";

test("add, edit, search, filter and delete contacts", async ({ page, context }) => {
  const user = await signInFreshUser(context);
  const { today } = await seedGoal(user.id, {
    title: "Get a backend developer job",
    startOffset: 0,
    deadlineOffset: 60,
    bufferDays: 9,
    milestones: [{ title: "Prepare", steps: ["Update my resume"] }],
  });

  // Quick add: a name and a company.
  await open(page, "/contacts");
  const main = page.getByRole("main");
  await main.getByLabel("New contact's name").fill("Ana Cruz");
  await main.getByLabel("Company").fill("Acme Digital");
  await main.getByRole("button", { name: "Add contact" }).click();
  await expect(main.getByRole("link", { name: /Ana Cruz/ })).toBeVisible();
  await main.getByLabel("New contact's name").fill("Ben Reyes");
  await main.getByRole("button", { name: "Add contact" }).click();
  await expect(main.getByRole("link", { name: /Ben Reyes/ })).toBeVisible();

  // Edit Ana: a bad link is refused, then everything saves.
  await main.getByRole("link", { name: /Ana Cruz/ }).click();
  await expect(page).toHaveURL(/\/contacts\/[0-9a-f-]{36}$/);
  await page.waitForLoadState("networkidle");
  await main.getByRole("button", { name: "Edit" }).click();
  await main.getByLabel("Role").fill("Engineering manager");
  await main.getByLabel("Where you met").fill("DevCon Manila 2026");
  await main.getByLabel("Follow up on").fill(addDays(today, -2));
  await main.getByLabel("Related goal").selectOption({ label: "Get a backend developer job" });
  await main.getByLabel("Email").fill("ana@example.com");
  await main.getByLabel("LinkedIn").fill("linkedin.com/in/anacruz");
  await main.getByRole("button", { name: "Save" }).click();
  await expect(alerts(page)).toContainText("starting with https://");
  await main.getByLabel("LinkedIn").fill("https://www.linkedin.com/in/anacruz");
  await main.getByRole("button", { name: "Save" }).click();

  await expect(main.getByRole("heading", { name: "Ana Cruz" })).toBeVisible();
  await expect(main.getByText("Engineering manager at Acme Digital")).toBeVisible();
  await expect(main.getByText(/^Overdue/)).toBeVisible();
  await expect(main.getByRole("link", { name: "Get a backend developer job" })).toBeVisible();
  await expect(main.getByRole("link", { name: "ana@example.com" })).toHaveAttribute("href", "mailto:ana@example.com");

  // The list: the overdue follow-up shows, and the filters and search work.
  await open(page, "/contacts");
  await expect(main.getByText(/Follow up: Overdue/)).toBeVisible();
  await main.getByRole("link", { name: "Follow up due" }).click();
  await expect(page).toHaveURL(/filter=due/);
  await expect(main.getByRole("link", { name: /Ana Cruz/ })).toBeVisible();
  await expect(main.getByRole("link", { name: /Ben Reyes/ })).toBeHidden();

  await open(page, "/contacts");
  await main.getByLabel("Search contacts").fill("acme");
  await main.getByLabel("Search contacts").press("Enter");
  await expect(page).toHaveURL(/q=acme/);
  await expect(main.getByRole("link", { name: /Ana Cruz/ })).toBeVisible();
  await expect(main.getByRole("link", { name: /Ben Reyes/ })).toBeHidden();

  // Delete asks first, then goes back to the list.
  await open(page, "/contacts");
  await main.getByRole("link", { name: /Ben Reyes/ }).click();
  await page.waitForLoadState("networkidle");
  await main.getByRole("button", { name: "Delete contact" }).click();
  await main.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page).toHaveURL(/\/contacts$/);
  await expect(main.getByRole("link", { name: /Ben Reyes/ })).toBeHidden();
  await expect(main.getByRole("link", { name: /Ana Cruz/ })).toBeVisible();
});

test("follow-ups on Today, touchpoints, and contacts on a goal", async ({ page, context }) => {
  const user = await signInFreshUser(context);
  const { id: goalId, today } = await seedGoal(user.id, {
    title: "Get a backend developer job",
    startOffset: 0,
    deadlineOffset: 60,
    bufferDays: 9,
    milestones: [{ title: "Prepare", steps: ["Update my resume"] }],
  });
  await db
    .insertInto("contacts")
    .values([
      { user_id: user.id, name: "Ana Cruz", company: "Acme Digital", follow_up_on: addDays(today, -1), goal_id: goalId },
      { user_id: user.id, name: "Ben Reyes", company: "Globe", follow_up_on: today },
    ])
    .execute();

  // Today: both are due. Snooze one, mark the other done.
  await open(page, "/today");
  const card = page.getByRole("region", { name: "Follow up" });
  await expect(card.getByRole("link", { name: /Ana Cruz/ })).toBeVisible();
  await card.getByRole("button", { name: "Snooze Ben Reyes for a week" }).click();
  await expect(card.getByRole("link", { name: /Ben Reyes/ })).toBeHidden();
  await card.getByRole("button", { name: "Done: followed up with Ana Cruz" }).click();
  await expect(page.getByRole("region", { name: "Follow up" })).toBeHidden();

  // Ana's page: the touchpoint from Today, and "last contacted".
  await open(page, "/contacts");
  const main = page.getByRole("main");
  await expect(main.getByText("Follow up: In 7 days")).toBeVisible(); // Ben, snoozed
  await main.getByRole("link", { name: /Ana Cruz/ }).click();
  await page.waitForLoadState("networkidle");
  await expect(main.getByText("Got in touch")).toBeVisible();
  await expect(main.getByText("No date set")).toBeVisible();

  // Log another touchpoint with a note and a follow-up in two weeks (the default).
  await main.getByRole("button", { name: "Log a touchpoint" }).click();
  await main.getByLabel("What happened (optional)").fill("Coffee chat, sent my portfolio");
  await expect(main.getByRole("radio", { name: "In 2 weeks" })).toHaveAttribute("aria-checked", "true");
  await main.getByRole("button", { name: "Save touchpoint" }).click();
  await expect(main.getByText("Coffee chat, sent my portfolio")).toBeVisible();
  await expect(main.getByText("Today", { exact: true })).toBeVisible(); // last contacted
  const nextFollowUp = describeFollowUp(addDays(today, 14), today).label;
  await expect(main.getByText(nextFollowUp, { exact: true })).toBeVisible();

  // A touchpoint logged by mistake can be removed.
  await main.getByRole("button", { name: /^Remove the touchpoint/ }).first().click();
  await expect(main.getByText("Coffee chat, sent my portfolio")).toBeHidden();

  // The goal page lists Ana.
  await open(page, `/goals/${goalId}`);
  const helpers = page.getByRole("region", { name: "People who can help" });
  await expect(helpers.getByRole("link", { name: /Ana Cruz/ })).toBeVisible();
});
