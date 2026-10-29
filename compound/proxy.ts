import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";

// A quick first check that runs before every page: signed-out visitors are
// sent to /login. It only reads the session cookie, never the database.
// The real check is requireUser() in lib/auth/dal.ts.
const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = ["/", "/login", "/privacy"];

export default auth((req) => {
  const isPublic = PUBLIC_PATHS.includes(req.nextUrl.pathname);
  if (!req.auth && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }
});

export const config = {
  // Skip API routes, Next.js internals, and files like favicon.ico or images.
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
