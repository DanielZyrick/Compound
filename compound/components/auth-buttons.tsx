import { signIn, signOut } from "@/auth";
import { Button } from "@/components/ui/button";

// Both buttons are plain forms that call a server action, so they work
// without any client-side JavaScript.

export function SignInWithGitHub() {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("github", { redirectTo: "/today" });
      }}
    >
      <Button type="submit" className="h-11 w-full text-base">
        Sign in with GitHub
      </Button>
    </form>
  );
}

export function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <Button type="submit" variant="ghost">
        Sign out
      </Button>
    </form>
  );
}
