import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { db } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,

    // Our users table requires an email, so refuse accounts without one.
    signIn({ user }) {
      return Boolean(user.email);
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
          // but refresh the avatar from GitHub.
          .onConflict((oc) => oc.column("email").doUpdateSet({ image: user.image ?? null }))
          .returning("id")
          .executeTakeFirstOrThrow();

        token.userId = row.id;
      }
      return token;
    },
  },
});
