"use client";

import { useSyncExternalStore } from "react";
import { useFormStatus } from "react-dom";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startDemo } from "@/lib/demo/actions";

// "Try the demo": opens a sample account, no sign-in needed. The browser's
// timezone goes along so the sample dates line up with the visitor's today.

const noSubscribe = () => () => {};
const browserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export function TryDemoButton({
  variant = "outline",
  className,
}: {
  variant?: "default" | "outline" | "ghost";
  className?: string;
}) {
  // Empty on the server, the real zone in the browser, without a hydration mismatch.
  const timezone = useSyncExternalStore(noSubscribe, browserTimezone, () => "");

  return (
    <form action={startDemo} className="contents">
      <input type="hidden" name="timezone" value={timezone} />
      <SubmitButton variant={variant} className={className} />
    </form>
  );
}

function SubmitButton({ variant, className }: { variant: "default" | "outline" | "ghost"; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending} className={className}>
      <Eye />
      {pending ? "Opening the demo…" : "Try the demo"}
    </Button>
  );
}
