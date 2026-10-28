"use client"; // error boundaries must be Client Components

import { ErrorMessage } from "@/components/error-message";

// Catches errors on the public pages (landing, login, onboarding).
export default function RootError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <ErrorMessage error={error} retry={retry} homeHref="/" />
    </main>
  );
}
