import { expect, test } from "@playwright/test";
import { addDays } from "../lib/dates/calendar";
import { alerts, open, seedGoal, signInFreshUser } from "./support";

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
