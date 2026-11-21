import { describe, expect, it } from "vitest";
import { AVATAR_HOSTS, contentSecurityPolicy, securityHeaders, SIGN_IN_HOSTS } from "./headers";

/** The policy as { directive: sources }. */
function directives(policy: string) {
  return Object.fromEntries(
    policy.split("; ").map((part) => {
      const [name, ...sources] = part.split(" ");
      return [name, sources];
    }),
  );
}

describe("contentSecurityPolicy", () => {
  const production = directives(contentSecurityPolicy({ isDev: false }));
  const dev = directives(contentSecurityPolicy({ isDev: true }));

  it("only allows eval in development", () => {
    expect(production["script-src"]).not.toContain("'unsafe-eval'");
    expect(dev["script-src"]).toContain("'unsafe-eval'");
  });

  it("keeps everything else on this site, and can't be framed", () => {
    expect(production["default-src"]).toEqual(["'self'"]);
    expect(production["connect-src"]).toEqual(["'self'"]);
    expect(production["frame-ancestors"]).toEqual(["'none'"]);
    expect(production["object-src"]).toEqual(["'none'"]);
  });

  it("lets avatars load and sign-in forms reach Google and GitHub", () => {
    for (const host of AVATAR_HOSTS) expect(production["img-src"]).toContain(host);
    for (const host of SIGN_IN_HOSTS) expect(production["form-action"]).toContain(host);
  });

  it("upgrades http links only in production", () => {
    expect(production).toHaveProperty("upgrade-insecure-requests");
    expect(dev).not.toHaveProperty("upgrade-insecure-requests");
  });
});

describe("securityHeaders", () => {
  it("sends every header once", () => {
    const keys = securityHeaders({ isDev: false }).map((h) => h.key);
    expect(keys).toEqual([
      "Content-Security-Policy",
      "Strict-Transport-Security",
      "X-Content-Type-Options",
      "Referrer-Policy",
      "Permissions-Policy",
      "X-Frame-Options",
    ]);
  });
});
