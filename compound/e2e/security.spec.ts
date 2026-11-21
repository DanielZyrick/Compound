import { expect, test, type Page } from "@playwright/test";
import { open } from "./support";

// Security headers (lib/security/headers.ts): every response carries them,
// and no page loads anything the Content Security Policy blocks. A blocked
// script, style or image shows up as a console error, which fails the test.

function collectViolations(page: Page) {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (/Content Security Policy|Content-Security-Policy/i.test(message.text())) violations.push(message.text());
  });
  return violations;
}

test("security headers are sent on every page", async ({ request }) => {
  for (const path of ["/", "/login", "/today"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    const headers = response.headers();
    expect(headers["content-security-policy"], path).toContain("frame-ancestors 'none'");
    expect(headers["content-security-policy"], path).not.toContain("unsafe-eval");
    expect(headers["strict-transport-security"], path).toContain("max-age=");
    expect(headers["x-content-type-options"], path).toBe("nosniff");
    expect(headers["referrer-policy"], path).toBe("strict-origin-when-cross-origin");
    expect(headers["x-frame-options"], path).toBe("DENY");
    expect(headers["x-powered-by"], path).toBeUndefined();
  }
});

test("public pages, the app and a lesson with code run under the policy", async ({ page }) => {
  const violations = collectViolations(page);

  await open(page, "/");
  await open(page, "/privacy");
  await open(page, "/login");

  // A demo account has every kind of page filled in, including a finished
  // lesson whose code blocks are coloured with inline styles.
  await page.getByRole("button", { name: "Try the demo" }).click();
  await expect(page).toHaveURL(/\/today$/, { timeout: 30_000 });
  await page.waitForLoadState("networkidle");

  await open(page, "/tracks");
  const trackLink = page.getByRole("link", { name: /Python for automating everyday tasks/ }).first();
  const trackUrl = await trackLink.getAttribute("href");
  await open(page, `${trackUrl}/day/1`);
  await expect(page.getByRole("heading", { name: "Practice" })).toBeVisible();
  await expect(page.locator("pre").first()).toBeVisible();

  await open(page, "/money");
  await open(page, "/settings");

  await page.getByRole("button", { name: "Sign in to start your own" }).click();
  await expect(page).toHaveURL(/\/login$/);

  expect(violations).toEqual([]);
});
