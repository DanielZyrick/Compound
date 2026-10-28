import { expect, test, type Page } from "@playwright/test";
import { alerts, open, seedGoal, signInFreshUser } from "./support";

/** Fills the add form and submits it; waits for the "Saved" confirmation. */
async function add(page: Page, amount: string, category: string, note?: string) {
  const form = page.locator("#quick-add");
  await form.getByLabel("Amount").fill(amount);
  await form.getByRole("button", { name: category, exact: true }).click();
  if (note) await form.getByLabel("Note (optional)").fill(note);
  await form.getByRole("button", { name: /^Add (expense|income)$/ }).click();
  await expect(form.getByRole("status")).toContainText("Saved");
}

test("record expenses and income, then edit and delete them", async ({ page, context }) => {
  await signInFreshUser(context);

  // From Today, one tap opens the add form.
  await open(page, "/today");
  await expect(page.getByText("Spent today")).toBeVisible();
  await page.getByRole("link", { name: "Expense" }).click();
  await expect(page).toHaveURL(/\/money\?add=expense/);
  await page.waitForLoadState("networkidle");

  // A bad amount is explained, not saved.
  const form = page.locator("#quick-add");
  await form.getByLabel("Amount").fill("abc");
  await form.getByRole("button", { name: "Food", exact: true }).click();
  await form.getByRole("button", { name: "Add expense" }).click();
  await expect(alerts(page)).toContainText("Enter an amount like 185");

  // Several in a row: the form clears after each one.
  await add(page, "185", "Food", "Lunch with the team");
  await expect(form.getByLabel("Amount")).toHaveValue("");
  await add(page, "1,250.50", "Transport");
  await form.getByRole("radio", { name: "Income" }).click();
  await add(page, "20000", "Salary");

  // Month totals and categories.
  const tiles = page.locator("dl");
  await expect(tiles).toContainText("₱1,435.50"); // spent
  await expect(tiles).toContainText("₱20,000.00"); // income
  await expect(tiles).toContainText("₱18,564.50"); // left
  await expect(page.getByText("Spending by category")).toBeVisible();

  // Edit the lunch: 185 → 200.
  await page.getByRole("button", { name: "Edit Food ₱185.00" }).click();
  const editor = page.locator("form").filter({ has: page.getByRole("button", { name: "Delete" }) });
  await editor.getByLabel("Amount").fill("200");
  await editor.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("button", { name: "Edit Food ₱200.00" })).toBeVisible();

  // Delete the transport expense.
  await page.getByRole("button", { name: "Edit Transport ₱1,250.50" }).click();
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("button", { name: /Edit Transport/ })).toBeHidden();
  await expect(tiles).toContainText("₱200.00");

  // Today shows what was spent.
  await open(page, "/today");
  await expect(page.locator("section").filter({ hasText: "Spent today" })).toContainText("₱200.00");

  // The previous month is empty.
  await open(page, "/money");
  await page.getByRole("link", { name: "Previous month" }).click();
  await expect(page.getByText("Nothing recorded this month yet.")).toBeVisible();
});

test("save toward a goal, and change the currency", async ({ page, context }) => {
  const user = await signInFreshUser(context);
  const { id: goalId } = await seedGoal(user.id, {
    title: "Emergency fund",
    startOffset: 0,
    deadlineOffset: 90,
    bufferDays: 10,
    milestones: [{ title: "Save the first half", steps: ["Open a savings account", "Set up a monthly transfer"] }],
  });

  // Give the goal a savings target.
  await open(page, `/goals/${goalId}`);
  await page.getByRole("button", { name: "Add savings target" }).click();
  await page.getByLabel("Savings target").fill("50,000");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("of ₱50,000.00 saved")).toBeVisible();

  // Income put toward it.
  await open(page, "/money?add=income");
  const form = page.locator("#quick-add");
  await expect(form.getByRole("radio", { name: "Income" })).toHaveAttribute("aria-checked", "true");
  await form.getByLabel("Amount").fill("5000");
  await form.getByRole("button", { name: "Salary", exact: true }).click();
  await form.getByLabel("Put toward a goal (optional)").selectOption({ label: "Emergency fund" });
  await form.getByRole("button", { name: "Add income" }).click();
  await expect(form.getByRole("status")).toContainText("Saved");
  await expect(page.getByText("Saved toward Emergency fund")).toBeVisible();

  // The goal shows it.
  await open(page, `/goals/${goalId}`);
  await expect(page.getByText("₱5,000.00", { exact: true })).toBeVisible();
  await expect(page.getByText("₱45,000.00 to go")).toBeVisible();

  // A different currency changes how amounts are shown.
  await open(page, "/settings");
  await page.getByLabel("Currency").selectOption("USD");
  await page.locator("form").filter({ has: page.getByLabel("Currency") }).getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("status")).toContainText("Saved");
  await open(page, "/money");
  await expect(page.locator("dl")).toContainText("$5,000.00");
});
