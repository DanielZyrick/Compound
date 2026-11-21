import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SignInWithGitHub, SignInWithGoogle } from "@/components/auth-buttons";
import { TryDemoButton } from "@/components/try-demo-button";
import { LogoMark } from "@/components/logo";
import { getCurrentUser } from "@/lib/auth/dal";
import { loginErrorMessage } from "@/lib/auth/login-errors";

export const metadata: Metadata = { title: "Sign in" };

// The card and button are static and load instantly. Only the part that
// reads the request (session and ?error=) waits, inside <Suspense>.
export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex flex-1 items-center justify-center bg-muted bg-grid px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="rounded-3xl border bg-card p-8 text-center shadow-card">
          <LogoMark className="mx-auto size-12" />

          <h1 className="mt-6 text-2xl font-semibold tracking-tight">Welcome to Compound</h1>
          <p className="mt-2 text-muted-foreground">Small daily steps, compounding growth.</p>

          <Suspense fallback={null}>
            <LoginNotice searchParams={searchParams} />
          </Suspense>

          <div className="mt-8 flex flex-col gap-3">
            <SignInWithGoogle />
            <SignInWithGitHub />
          </div>
          <div className="mt-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="mt-6 flex flex-col">
            <TryDemoButton variant="ghost" className="h-11 w-full text-base" />
            <p className="mt-1 text-xs text-muted-foreground">Look around with sample data. No account needed.</p>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            New here? Signing in creates your account. See how your data is used in our{" "}
            <Link href="/privacy" className="underline hover:text-foreground">
              privacy policy
            </Link>
            .
          </p>
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

  const params = await searchParams;
  // After "Delete my account" in Settings.
  if (params.deleted === "1") {
    return (
      <p role="status" className="mt-6 rounded-lg border bg-muted p-3 text-left text-sm">
        Your account and all its data were deleted. You can sign in again any time to start fresh.
      </p>
    );
  }

  const message = loginErrorMessage(params.error, params.code);
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
