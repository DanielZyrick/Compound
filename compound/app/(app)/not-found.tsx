import Link from "next/link";
import { StatusMessage } from "@/components/status-message";
import { buttonVariants } from "@/components/ui/button";

// Shown inside the app shell (sidebar stays) when a page calls notFound(),
// for example a track or lesson that doesn't exist or isn't yours.
export default function AppNotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <StatusMessage
        eyebrow="404"
        title="We couldn't find that"
        actions={
          <>
            <Link href="/tracks" className={buttonVariants({ variant: "outline" })}>
              Your tracks
            </Link>
            <Link href="/today" className={buttonVariants()}>
              Go to Today
            </Link>
          </>
        }
      >
        It may have been deleted, or the link may be wrong.
      </StatusMessage>
    </main>
  );
}
