import { describe, expect, it } from "vitest";
import { loginErrorMessage } from "./login-errors";

describe("loginErrorMessage", () => {
  it("returns null when there's no error", () => {
    expect(loginErrorMessage(undefined)).toBeNull();
    expect(loginErrorMessage("")).toBeNull();
    expect(loginErrorMessage([])).toBeNull();
  });

  it("explains a missing verified email", () => {
    expect(loginErrorMessage("AccessDenied")).toMatch(/verified email/);
  });

  it("explains a cancelled GitHub sign-in", () => {
    expect(loginErrorMessage("OAuthCallbackError")).toMatch(/cancelled/);
  });

  it("explains an expired sign-in form", () => {
    expect(loginErrorMessage("MissingCSRF")).toMatch(/expired/);
  });

  it("shows a generic message for server problems and unknown codes", () => {
    const generic = loginErrorMessage("Configuration");
    expect(generic).toMatch(/on our side/);
    expect(loginErrorMessage("SomethingNew")).toBe(generic);
    // Inherited object keys must not count as known codes.
    expect(loginErrorMessage("toString")).toBe(generic);
  });

  it("uses the first code when ?error= appears twice", () => {
    expect(loginErrorMessage(["MissingCSRF", "AccessDenied"])).toMatch(/expired/);
  });
});
