import { expect, test } from "@playwright/test";
import { addDays } from "../lib/dates/calendar";
import { open, seedGoal, signInFreshUser } from "./support";

// Goals in AI demo mode (forced by playwright.config.ts).

test("create a goal, then tick, add, rename and delete steps", async ({ page, context }) => {
  await signInFreshUser(context);
  await open(page, "/goals/new");

  await page.getByLabel("Your goal").fill("Launch my portfolio website");
  await page.getByLabel("Why it matters to you").fill("So I can apply for developer jobs with real projects.");
  const deadline = addDays(new Date().toISOString().slice(0, 10), 30);
  await page.getByLabel("Deadline").fill(deadline);
  await expect(page.getByText(/Plan to finish by/)).toBeVisible();
  await page.getByRole("button", { name: "Create goal" }).click();

  // The goal page: plan, status and the example guide. Creating saves the plan
  // and opens the new goal, so allow more than the default 5 seconds.
  await expect(page).toHaveURL(/\/goals\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Launch my portfolio website");
  await expect(page.getByText("On track", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Execution guide" })).toBeVisible();

  // Tick the first step; it's saved, and progress moves above 0%.
  const plan = page.getByRole("main").getByRole("listitem");
  const firstStep = plan.first().getByRole("checkbox").first();
  const saved = page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes("/goals/"));
  await firstStep.click();
  await expect(firstStep).toHaveAttribute("aria-checked", "true");
  await saved;
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(plan.first().getByRole("checkbox").first()).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("progressbar", { name: "Goal progress" })).not.toHaveAttribute("aria-valuenow", "0");

  // Add a step to the first milestone, rename it, then delete it.
  await plan.first().getByRole("button", { name: "Add a step" }).click();
  await page.getByLabel("Step").fill("Ask a friend to review the plan");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Ask a friend to review the plan")).toBeVisible();

  await page.getByRole("button", { name: "Rename Ask a friend to review the plan" }).click();
  await page.getByLabel("Step").fill("Ask a mentor to review the plan");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Ask a mentor to review the plan")).toBeVisible();

  await page.getByRole("button", { name: "Delete Ask a mentor to review the plan" }).click();
  await expect(page.getByText("Ask a mentor to review the plan")).toBeHidden();

  // Today offers the goal's next step; ticking it moves on to the one after.
  await open(page, "/today");
  const card = page.locator("section").filter({ hasText: "Goal steps" });
  const next = card.getByRole("checkbox");
  const before = await next.getAttribute("aria-label");
  await next.click();
  // The tick shows at once; the following step arrives when Today reloads.
  await expect(card.getByRole("checkbox")).not.toHaveAttribute("aria-label", before!, { timeout: 15_000 });
});

test("an at-risk goal shows a nav dot, and extending the deadline fixes it", async ({ page, context }) => {
  const user = await signInFreshUser(context);
  // Started 20 days ago, due in 3 days, nothing done: it can't finish in time.
  const { id, today } = await seedGoal(user.id, {
    title: "Write my thesis draft",
    startOffset: -20,
    deadlineOffset: 3,
    bufferDays: 2,
    milestones: [
      { title: "Research", steps: ["Read five papers", "Write notes"] },
      { title: "Draft", steps: ["Write chapter one", "Write chapter two"] },
    ],
  });

  await open(page, "/goals");
  await expect(page.getByRole("main").getByText("At risk")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main" }).first()).toContainText("(needs attention)");

  await open(page, `/goals/${id}`);
  await expect(page.getByRole("status")).toContainText("after the deadline");
  await page.getByLabel("New deadline").fill(addDays(today, 60));
  await page.getByRole("button", { name: "Extend deadline" }).click();
  await expect(page.getByText("On track", { exact: true })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("you'll finish by");

  // Archive it: it leaves the list.
  await page.getByRole("button", { name: "Archive goal" }).click();
  await page.getByRole("button", { name: "Archive", exact: true }).click();
  await expect(page).toHaveURL(/\/goals$/);
  // Next.js keeps the previous page in the DOM (hidden) for instant back
  // navigation, so check what's visible rather than what exists.
  await expect(page.getByText("No goals yet.")).toBeVisible();
  await expect(page.getByText("Write my thesis draft")).toBeHidden();
});
