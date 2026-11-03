import { describe, expect, it } from "vitest";
import { CALENDAR_SCOPE, consentUrl, emailFromIdToken, grantedCalendar, statesMatch } from "./oauth";

describe("consentUrl", () => {
  it("asks for read-only calendar access and a refresh token", () => {
    const url = new URL(consentUrl({ clientId: "id", redirectUri: "https://x.test/api/calendar/callback", state: "abc" }));
    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("scope")).toBe(`openid email ${CALENDAR_SCOPE}`);
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("state")).toBe("abc");
    expect(url.searchParams.get("redirect_uri")).toBe("https://x.test/api/calendar/callback");
  });

  it("never asks to change the calendar", () => {
    const scope = new URL(consentUrl({ clientId: "id", redirectUri: "r", state: "s" })).searchParams.get("scope")!;
    expect(scope).not.toMatch(/auth\/calendar(\s|$)/);
    expect(scope).not.toContain("calendar.events");
  });
});

describe("grantedCalendar", () => {
  it("checks the calendar scope was actually granted", () => {
    expect(grantedCalendar(`openid email ${CALENDAR_SCOPE}`)).toBe(true);
    expect(grantedCalendar("openid email")).toBe(false);
    expect(grantedCalendar(undefined)).toBe(false);
  });
});

describe("emailFromIdToken", () => {
  const token = (payload: object) => `h.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.s`;

  it("reads the email", () => {
    expect(emailFromIdToken(token({ email: "ana@gmail.com" }))).toBe("ana@gmail.com");
  });

  it("is null for a missing or broken token", () => {
    expect(emailFromIdToken(undefined)).toBeNull();
    expect(emailFromIdToken("not-a-jwt")).toBeNull();
    expect(emailFromIdToken(token({ sub: "1" }))).toBeNull();
  });
});

describe("statesMatch", () => {
  it("needs both and equal", () => {
    expect(statesMatch("abc", "abc")).toBe(true);
    expect(statesMatch("abc", "abd")).toBe(false);
    expect(statesMatch("abc", "abcd")).toBe(false);
    expect(statesMatch(null, "abc")).toBe(false);
    expect(statesMatch("abc", undefined)).toBe(false);
  });
});
