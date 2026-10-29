import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";

// A plain form that calls a server action, so it works without client-side
// JavaScript. Sign-out lives in the app shell's user menu.

export function SignInWithGoogle() {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("google", { redirectTo: "/today" });
      }}
    >
      <Button type="submit" variant="outline" className="h-11 w-full gap-2 text-base">
        <GoogleMark />
        Continue with Google
      </Button>
    </form>
  );
}

export function SignInWithGitHub() {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("github", { redirectTo: "/today" });
      }}
    >
      <Button type="submit" className="h-11 w-full gap-2 text-base">
        <GitHubMark />
        Continue with GitHub
      </Button>
    </form>
  );
}

// lucide-react has no brand icons, so these are Google's "G" and GitHub's own mark (Octicons).
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4.5">
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.11A11.99 11.99 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.29 14.28A7.2 7.2 0 0 1 4.91 12c0-.79.14-1.56.38-2.28V6.61H1.28A11.99 11.99 0 0 0 0 12c0 1.94.46 3.77 1.28 5.39l4.01-3.11Z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.28 6.61l4.01 3.11C6.23 6.88 8.88 4.77 12 4.77Z" />
    </svg>
  );
}

function GitHubMark() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-4.5 fill-current">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}
