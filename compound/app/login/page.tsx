import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SignInWithGitHub, SignInWithGoogle } from "@/components/auth-buttons";
import { FloatingTile } from "@/components/landing/floating";
import { LogoMark } from "@/components/logo";
import { getCurrentUser } from "@/lib/auth/dal";
import { loginErrorMessage } from "@/lib/auth/login-errors";

export const metadata: Metadata = { title: "Sign in" };

// The card and button are static and load instantly. Only the part that
// reads the request (session and ?error=) waits, inside <Suspense>.
export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex flex-1 items-center justify-center bg-muted bg-dots px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="rounded-[28px] border bg-card p-8 text-center shadow-card">
          <FloatingTile className="mx-auto">
            <LogoMark className="size-8" />
          </FloatingTile>

          <h1 className="mt-6 text-2xl font-semibold tracking-tight">Welcome to Compound</h1>
          <p className="mt-2 text-muted-foreground">Small daily steps, compounding growth.</p>

          <Suspense fallback={null}>
            <LoginNotice searchParams={searchParams} />
          </Suspense>

          <div className="mt-8 flex flex-col gap-3">
            <SignInWithGoogle />
            <SignInWithGitHub />
          </div>
          <p className="mt-4 text-xs text-subtle">New here? Signing in creates your account.</p>
        </div>

        <Link
          href="/"
          className="mt-6 flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to home
        </Link>
      </div>
    </main>
  );
}

async function LoginNotice({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  if (await getCurrentUser()) redirect("/today");

  const message = loginErrorMessage((await searchParams).error);
  if (!message) return null;

  return (
    <p
      role="alert"
      className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-left text-sm text-destructive"
    >
      {message}
    </p>
  );
}
