import Link from "next/link";

// Fully static: no session read. Signed-out visitors who click through are
// sent from /today to /login by proxy.ts.
export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-6 px-4">
      <h1 className="text-4xl font-semibold">Compound</h1>
      <p className="text-lg opacity-80">
        Small daily steps, compounding growth. Track your habits and follow short daily lessons
        with AI feedback.
      </p>
      <Link
        href="/today"
        className="self-start rounded-lg bg-foreground px-5 py-3 font-medium text-background hover:opacity-90"
      >
        Get started
      </Link>
    </main>
  );
}
