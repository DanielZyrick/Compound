"use client";

import Link from "next/link";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { RotateCw } from "lucide-react";
import { StatusMessage } from "@/components/status-message";
import { Button, buttonVariants } from "@/components/ui/button";
import { shouldReportFromBrowser } from "@/lib/monitoring/options";

/**
 * The body of the error pages. Server errors arrive with a generic message
 * and a digest (an id that matches the server log), never their details, so
 * only the digest is shown, as a reference.
 */
export function ErrorMessage({ error, retry, homeHref }: { error: unknown; retry: () => void; homeHref: string }) {
  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null;

  useEffect(() => {
    console.error(error);
    // Browser errors go to Sentry from here; server ones were reported on the server.
    if (shouldReportFromBrowser(error)) Sentry.captureException(error);
  }, [error]);

  return (
    <StatusMessage
      eyebrow="Something went wrong"
      title="We hit a problem loading this page"
      actions={
        <>
          <Link href={homeHref} className={buttonVariants({ variant: "outline" })}>
            {homeHref === "/today" ? "Go to Today" : "Home"}
          </Link>
          <Button onClick={() => retry()}>
            <RotateCw />
            Try again
          </Button>
        </>
      }
    >
      <p>Your data is safe. Try again in a moment.</p>
      {digest && <p className="mt-3 font-mono text-xs text-subtle">Reference: {digest}</p>}
    </StatusMessage>
  );
}
