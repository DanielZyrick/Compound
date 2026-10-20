import type { DefaultSession } from "next-auth";

// Tell TypeScript about the extra fields we store in the session.
declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    userId?: string; // our users.id, set in auth.ts on sign-in
  }
}
