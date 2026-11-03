import { randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { decryptToken, encryptToken } = await import("./crypto");

const key = randomBytes(32).toString("base64");

describe("encryptToken / decryptToken", () => {
  it("round-trips a token", () => {
    const sealed = encryptToken("1//refresh-token-value", key);
    expect(sealed).toMatch(/^v1\./);
    expect(sealed).not.toContain("refresh-token-value");
    expect(decryptToken(sealed, key)).toBe("1//refresh-token-value");
  });

  it("uses a fresh IV, so the same token never encrypts the same way twice", () => {
    expect(encryptToken("same", key)).not.toBe(encryptToken("same", key));
  });

  it("refuses a changed value or the wrong key", () => {
    const sealed = encryptToken("secret", key);
    const parts = sealed.split(".");
    const tampered = [...parts.slice(0, 3), Buffer.from("other").toString("base64url")].join(".");
    expect(() => decryptToken(tampered, key)).toThrow();
    expect(() => decryptToken(sealed, randomBytes(32).toString("base64"))).toThrow();
  });

  it("needs a 32-byte key", () => {
    expect(() => encryptToken("x", randomBytes(16).toString("base64"))).toThrow(/32 bytes/);
    expect(() => encryptToken("x", undefined)).toThrow(/32 bytes/);
  });
});
