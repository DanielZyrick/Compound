import { expect, test } from "@playwright/test";
import { open, signInFreshUser } from "./support";

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
