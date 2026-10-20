import { Suspense } from "react";
import { redirect } from "next/navigation";
import { SignInWithGitHub } from "@/components/auth-buttons";
import { getCurrentUser } from "@/lib/auth/dal";

// The heading and button are static and load instantly. Only the part that
// reads the request (session and ?error=) waits, inside <Suspense>.
export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-2xl font-semibold">Sign in to Compound</h1>
        <p className="mt-1 text-sm opacity-70">Small daily steps, compounding growth.</p>
      </div>

      <Suspense fallback={null}>
        <LoginNotice searchParams={searchParams} />
      </Suspense>

      <SignInWithGitHub />
    </main>
  );
}

async function LoginNotice({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  if (await getCurrentUser()) redirect("/today");

  // Auth.js sends sign-in failures here as /login?error=...
  const { error } = await searchParams;
  if (!error) return null;

  return (
    <p role="alert" className="rounded-lg border border-red-500/40 p-3 text-sm text-red-600">
      Sign-in didn&apos;t work. Make sure your GitHub account has a verified email, then try again.
    </p>
  );
}
