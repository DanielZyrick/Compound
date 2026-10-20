import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";

// The part of the Auth.js setup that never touches the database.
// proxy.ts uses only this file, so it stays fast and free of database code.
// auth.ts adds the database step on top of it.
export const authConfig = {
  providers: [GitHub], // reads AUTH_GITHUB_ID and AUTH_GITHUB_SECRET from env
  session: { strategy: "jwt" }, // the session lives in a signed cookie
  pages: {
    signIn: "/login",
    error: "/login", // sign-in errors land on /login?error=...
  },
  callbacks: {
    // Copy our own users.id from the cookie token into the session object.
    session({ session, token }) {
      if (token.userId) session.user.id = token.userId;
      return session;
    },
  },
} satisfies NextAuthConfig;
