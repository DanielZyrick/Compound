"use client"; // error boundaries must be Client Components

import { ErrorMessage } from "@/components/error-message";

// Catches errors in the signed-in pages. It sits inside the (app) layout, so
// the sidebar and tab bar stay usable while the page shows the error.
export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <ErrorMessage error={error} retry={retry} homeHref="/today" />
    </main>
  );
}
