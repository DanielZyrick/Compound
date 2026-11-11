import { expect, test } from "@playwright/test";
import { addDays, todayIn } from "../lib/dates/calendar";
import { db, open, signInFreshUser, TEST_TIMEZONE } from "./support";

test("write, tick, pin, edit and delete notes", async ({ page, context }) => {
  await signInFreshUser(context);

  // Quick add on Today: type and press Enter.
  await open(page, "/today");
  const card = page.getByRole("region", { name: "Notes" });
  const add = card.getByLabel("New note");
  await add.fill("Call the bank");
  await add.press("Enter");
  await expect(card.getByRole("checkbox", { name: "Call the bank" })).toBeVisible();
  await expect(add).toHaveValue("");
  await add.fill("Buy running shoes");
  await add.press("Enter");

  // Tick one off; it stays ticked after a reload.
  const shoes = card.getByRole("checkbox", { name: "Buy running shoes" });
  const saved = page.waitForResponse((r) => r.request().method() === "POST" && r.url().endsWith("/today"));
  await shoes.click();
  await expect(shoes).toHaveAttribute("aria-checked", "true");
  await saved;
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(card.getByRole("checkbox", { name: "Buy running shoes" })).toHaveAttribute("aria-checked", "true");

  // The Notes page shows open notes by default.
  await card.getByRole("link", { name: /See all/ }).click();
  await expect(page).toHaveURL(/\/notes$/);
  await page.waitForLoadState("networkidle");
  const main = page.getByRole("main");
  await expect(main.getByRole("checkbox", { name: "Call the bank" })).toBeVisible();
  await expect(main.getByRole("checkbox", { name: "Buy running shoes" })).toBeHidden();

  // New notes are yellow sticky notes.
  await expect(main.locator('[data-color="yellow"]').filter({ hasText: "Call the bank" })).toBeVisible();

  // Pin it, then add details and make it pink.
  await main.getByRole("button", { name: "Pin Call the bank" }).click();
  await expect(main.getByRole("button", { name: "Unpin Call the bank" })).toBeVisible();
  await main.getByRole("button", { name: "Edit Call the bank" }).click();
  await main.getByLabel("Details (optional)").fill("Ask about the annual fee.\nAnd the new card.");
  await main.getByRole("radio", { name: "Pink" }).click();
  await main.getByRole("button", { name: "Save" }).click();
  await expect(main.getByText("Ask about the annual fee.")).toBeVisible();
  await expect(main.locator('[data-color="pink"]').filter({ hasText: "Call the bank" })).toBeVisible();

  // Done notes have their own filter.
  await main.getByRole("link", { name: "Done" }).click();
  await expect(page).toHaveURL(/filter=done/);
  await expect(main.getByRole("checkbox", { name: "Buy running shoes" })).toBeVisible();

  // Delete asks first.
  await open(page, "/notes");
  await main.getByRole("button", { name: "Delete Call the bank" }).click();
  await main.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(main.getByText("No notes yet. Write one above.")).toBeVisible();
});

test("to-dos with a due date: what's due comes first on Today, and dates can be set and cleared", async ({ page, context }) => {
  const user = await signInFreshUser(context);
  const today = todayIn(TEST_TIMEZONE);
  // Four newer notes without dates, and three older ones with: late, due today, due later.
  const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000);
  await db
    .insertInto("notes")
    .values([
      ...["One", "Two", "Three", "Four"].map((title, i) => ({ user_id: user.id, title, updated_at: ago(i) })),
      { user_id: user.id, title: "Renew passport", due_on: addDays(today, -1), updated_at: ago(60) },
      { user_id: user.id, title: "Pay rent", due_on: today, updated_at: ago(61) },
      { user_id: user.id, title: "Plan the trip", due_on: addDays(today, 30), updated_at: ago(62) },
    ])
    .execute();

  // Today: the two that are due lead the card, most overdue first, and are counted.
  await open(page, "/today");
  const card = page.getByRole("region", { name: "Notes" });
  await expect(card.getByRole("heading", { level: 2 })).toContainText("2 due");
  const shown = card.getByRole("article");
  await expect(shown.nth(0)).toContainText("Renew passport");
  await expect(shown.nth(0)).toContainText("Overdue · 1 day");
  await expect(shown.nth(1)).toContainText("Pay rent");
  await expect(shown.nth(1)).toContainText("Due today");
  await expect(card.getByText("Plan the trip")).toBeHidden(); // not due yet, and older than the rest
  if (test.info().project.name === "desktop") {
    await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: /^Notes/ })).toContainText("(needs attention)");
  }

  // Ticking them off clears the count.
  for (const title of ["Renew passport", "Pay rent"]) {
    const saved = page.waitForResponse((r) => r.request().method() === "POST" && r.url().endsWith("/today"));
    await card.getByRole("checkbox", { name: title }).click();
    await saved;
  }
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(card.getByRole("heading", { level: 2 })).not.toContainText("due");

  // Done notes only say when they were due.
  await open(page, "/notes?filter=done");
  const main = page.getByRole("main");
  await expect(main.getByText(/^Was due /)).toHaveCount(2);

  // Notes page: by due date after pinned ones; add one due tomorrow from the quick-add box.
  await open(page, "/notes");
  await expect(main.getByRole("article").first()).toContainText("Plan the trip");
  await main.getByLabel("New note").fill("Send the invoice");
  await main.getByRole("button", { name: "Set a due date" }).click();
  await main.getByRole("button", { name: "Tomorrow" }).click();
  const due = main.getByLabel("Due", { exact: true });
  await expect(due).toHaveValue(/^\d{4}-\d{2}-\d{2}$/);
  await due.fill(addDays(today, 1)); // the same day, whatever this machine's timezone
  await main.getByLabel("New note").press("Enter");
  const invoice = main.getByRole("article").filter({ hasText: "Send the invoice" });
  await expect(invoice).toContainText("Due tomorrow");
  await expect(main.getByRole("article").first()).toContainText("Send the invoice"); // soonest first

  // Clear the date while editing.
  await main.getByRole("button", { name: "Edit Send the invoice" }).click();
  await expect(due).toHaveValue(addDays(today, 1));
  await main.getByRole("button", { name: "Clear" }).click();
  await main.getByRole("button", { name: "Save" }).click();
  await expect(invoice).toBeVisible();
  await expect(invoice).not.toContainText("Due");
});
