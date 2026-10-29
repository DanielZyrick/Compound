import { describe, expect, it } from "vitest";
import { isVerifiedGitHubEmail } from "./verified-email";

describe("isVerifiedGitHubEmail", () => {
  const emails = [
    { email: "Alex@Example.com", verified: true, primary: true },
    { email: "old@example.com", verified: false, primary: false },
  ];

  it("accepts a verified address, ignoring case", () => {
    expect(isVerifiedGitHubEmail(emails, "alex@example.com")).toBe(true);
  });

  it("refuses an unverified address, even a primary one", () => {
    expect(isVerifiedGitHubEmail(emails, "old@example.com")).toBe(false);
    expect(isVerifiedGitHubEmail([{ email: "a@b.co", verified: false, primary: true }], "a@b.co")).toBe(false);
  });

  it("refuses an address the account doesn't have", () => {
    expect(isVerifiedGitHubEmail(emails, "someone@example.com")).toBe(false);
  });

  it("refuses when GitHub's answer is missing or malformed", () => {
    expect(isVerifiedGitHubEmail(null, "alex@example.com")).toBe(false);
    expect(isVerifiedGitHubEmail({ message: "Bad credentials" }, "alex@example.com")).toBe(false);
    expect(isVerifiedGitHubEmail([null, { email: 1 }], "alex@example.com")).toBe(false);
  });
});
