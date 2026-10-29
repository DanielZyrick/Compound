// Accounts are matched by email, so someone signing in with Google and GitHub
// using the same address lands in the same account. That's only safe when
// the provider has verified the address belongs to them.

/** One entry from GitHub's GET /user/emails. */
export type GitHubEmail = { email: string; verified: boolean; primary: boolean };

/** True when `email` is one of the account's verified GitHub addresses. */
export function isVerifiedGitHubEmail(emails: unknown, email: string): boolean {
  if (!Array.isArray(emails)) return false;
  const wanted = email.toLowerCase();
  return emails.some(
    (e: Partial<GitHubEmail>) => typeof e?.email === "string" && e.email.toLowerCase() === wanted && e.verified === true,
  );
}

/** Asks GitHub which of the user's addresses are verified (needs the user:email scope). */
export async function fetchGitHubEmails(accessToken: string): Promise<unknown> {
  const res = await fetch("https://api.github.com/user/emails", {
    headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": "compound", Accept: "application/vnd.github+json" },
  });
  return res.ok ? res.json() : null;
}
