import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { StatusMessage } from "@/components/status-message";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found" };

// Shown for any URL that doesn't exist, outside the signed-in app.
export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center bg-muted bg-dots px-4 py-12">
      <div className="w-full max-w-md rounded-[28px] border bg-card p-8 shadow-card">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <StatusMessage
          eyebrow="404"
          title="This page doesn't exist"
          actions={
            <>
              <Link href="/" className={buttonVariants({ variant: "outline" })}>
                Home
              </Link>
              <Link href="/today" className={buttonVariants()}>
                Go to Today
              </Link>
            </>
          }
        >
          The link may be broken, or the page may have moved.
        </StatusMessage>
      </div>
    </main>
  );
}
