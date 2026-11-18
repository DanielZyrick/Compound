import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { db } from "@/lib/db";
import { fetchGitHubEmails, isVerifiedGitHubEmail } from "@/lib/auth/verified-email";
import { createDemoUser, DemoBusyError } from "@/lib/demo/create";

/** Shown on /login as ?error=CredentialsSignin&code=demo_busy. */
class DemoBusy extends CredentialsSignin {
  code = "demo_busy";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    ...authConfig.providers,
    // "Try the demo": every sign-in creates a brand-new demo account, so it
    // can never be used to sign in as someone else. Only the browser's
    // timezone is accepted from the form.
    Credentials({
      id: "demo",
      name: "Demo",
      credentials: { timezone: {} },
      async authorize({ timezone }) {
        try {
          return await createDemoUser(timezone);
        } catch (error) {
          if (error instanceof DemoBusyError) throw new DemoBusy();
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,

    // Accounts are matched by email, so only accept an address the provider
    // has verified. Otherwise someone could add your address, unverified, to
    // their own account and sign in as you. A refusal shows ?error=AccessDenied.
    async signIn({ user, account, profile }) {
      if (!user.email) return false;
      if (account?.provider === "demo") return true; // created by createDemoUser just now
      if (account?.provider === "google") return profile?.email_verified === true;
      if (account?.provider === "github" && account.access_token) {
        return isVerifiedGitHubEmail(await fetchGitHubEmails(account.access_token), user.email);
      }
      return false;
    },

    // Runs whenever the session cookie is created or read. `user` is only
    // present right after signing in: that's when we find or create the
    // user's row and remember its id in the token.
    async jwt({ token, user }) {
      if (user?.email) {
        const row = await db
          .insertInto("users")
          .values({
            email: user.email.toLowerCase(),
            name: user.name ?? null,
            image: user.image ?? null,
          })
          // Returning user: keep their name (they may change it in settings),
          // but refresh the avatar from the provider they signed in with.
          .onConflict((oc) => oc.column("email").doUpdateSet({ image: user.image ?? null }))
          .returning("id")
          .executeTakeFirstOrThrow();

        token.userId = row.id;
      }
      return token;
    },
  },
});
