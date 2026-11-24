import { describe, expect, it } from "vitest";
import type { ErrorEvent } from "@sentry/nextjs";
import { scrubBreadcrumb, scrubEvent, sentryOptions, shouldReportFromBrowser } from "./options";

describe("sentryOptions", () => {
  it("is off without a DSN, so dev, tests and CI send nothing", () => {
    expect(sentryOptions(undefined).enabled).toBe(false);
    expect(sentryOptions("").enabled).toBe(false);
    expect(sentryOptions("https://key@o0.ingest.sentry.io/1").enabled).toBe(true);
  });

  it("sends errors only, never personal data by default", () => {
    const options = sentryOptions("https://key@o0.ingest.sentry.io/1");
    expect(options.sendDefaultPii).toBe(false);
    expect(options.tracesSampleRate).toBe(0);
  });
});

describe("scrubEvent", () => {
  const event = (): ErrorEvent => ({
    type: undefined,
    message: "x".repeat(500),
    request: {
      method: "POST",
      url: "https://compound.app/contacts?q=Ana%20Reyes",
      headers: { cookie: "authjs.session-token=secret" },
      cookies: { "authjs.session-token": "secret" },
      data: { note: "Call the bank about my loan" },
      query_string: "q=Ana%20Reyes",
    },
    user: { id: "u1", email: "dan@example.com", username: "Dan", ip_address: "203.0.113.9" },
    exception: { values: [{ type: "Error", value: "y".repeat(500) }] },
  });

  it("keeps only the method and path of the request", () => {
    expect(scrubEvent(event()).request).toEqual({ method: "POST", url: "https://compound.app/contacts" });
  });

  it("keeps only the user's internal id", () => {
    expect(scrubEvent(event()).user).toEqual({ id: "u1" });
    expect(scrubEvent({ ...event(), user: { email: "dan@example.com" } }).user).toBeUndefined();
  });

  it("cuts long messages short, in case one quotes what the user typed", () => {
    const scrubbed = scrubEvent(event());
    expect(scrubbed.message!.length).toBeLessThanOrEqual(301);
    expect(scrubbed.exception!.values![0].value!.length).toBeLessThanOrEqual(301);
  });

  it("never lets a cookie, header, body or email through", () => {
    const json = JSON.stringify(scrubEvent(event()));
    for (const secret of ["secret", "cookie", "loan", "dan@example.com", "203.0.113.9", "Ana"]) {
      expect(json).not.toContain(secret);
    }
  });
});

describe("scrubBreadcrumb", () => {
  it("drops console lines and strips query strings from URLs", () => {
    expect(scrubBreadcrumb({ category: "console", message: "my note text" })).toBeNull();
    expect(scrubBreadcrumb({ category: "navigation", data: { from: "/contacts?q=Ana", to: "/today#top" } })).toEqual({
      category: "navigation",
      data: { from: "/contacts", to: "/today" },
    });
    expect(scrubBreadcrumb({ category: "fetch", data: { url: "/api/account/export?x=1", status_code: 500 } })!.data).toEqual({
      url: "/api/account/export",
      status_code: 500,
    });
  });
});

describe("shouldReportFromBrowser", () => {
  it("reports browser errors, but not server errors (they carry a digest and were reported there)", () => {
    expect(shouldReportFromBrowser(new Error("click handler failed"))).toBe(true);
    expect(shouldReportFromBrowser(Object.assign(new Error("hidden"), { digest: "123" }))).toBe(false);
    expect(shouldReportFromBrowser("a string")).toBe(true);
  });
});
